-- =============================================================
-- Phase 1: Foundation
-- Roles, departments, user profiles + Row Level Security.
-- RLS is THE permission system. App code is UI convenience only.
-- =============================================================

-- 1. Role enum: invalid roles are impossible at the type level.
create type public.app_role as enum (
  'super_admin',
  'admin',
  'hr',
  'finance',
  'procurement',
  'sales',
  'workshop'
);

-- 2. Departments
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

insert into public.departments (name, description) values
  ('Administration', 'Management and administration'),
  ('Human Resources', 'HR, payroll and attendance'),
  ('Finance', 'Accounts, invoicing and payments'),
  ('Procurement', 'Purchasing and supplier management'),
  ('Sales', 'Quotations and client management'),
  ('Workshop', 'Fabrication and site installation');

-- 3. Profiles: one row per auth user. Supabase Auth owns credentials;
--    this table owns business identity (role, department, active flag).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  role public.app_role not null default 'workshop',
  department_id uuid references public.departments (id),
  is_active boolean not null default false, -- admin must activate new signups
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_department_id_idx on public.profiles (department_id);

-- 4. Role helpers.
--    SECURITY DEFINER so reading the caller's own role does not recurse
--    through the profiles RLS policies.
create or replace function public.current_user_role()
returns public.app_role
language sql stable security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_one_of(allowed public.app_role[])
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = any (allowed), false);
$$;

-- 5. Auto-create a profile when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 6. updated_at maintenance
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 7. Privilege-escalation guard.
--    RLS cannot compare OLD vs NEW, so a trigger blocks non-admins from
--    changing role / department / active flag (including on their own row).
--    auth.uid() IS NULL means service-role or migration context: allowed.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and (
       new.role is distinct from old.role
       or new.department_id is distinct from old.department_id
       or new.is_active is distinct from old.is_active
     )
     and not public.is_one_of(array['admin','super_admin']::public.app_role[])
  then
    raise exception 'Only admins may change role, department or active status';
  end if;
  return new;
end;
$$;

create trigger profiles_privilege_guard
  before update on public.profiles
  for each row execute function public.protect_profile_privileges();

-- 8. Row Level Security
alter table public.departments enable row level security;
alter table public.profiles enable row level security;

-- Departments: readable by any authenticated user, writable by admins.
create policy departments_select_authenticated
  on public.departments for select
  to authenticated
  using (true);

create policy departments_insert_admin
  on public.departments for insert
  to authenticated
  with check (public.is_one_of(array['admin','super_admin']::public.app_role[]));

create policy departments_update_admin
  on public.departments for update
  to authenticated
  using (public.is_one_of(array['admin','super_admin']::public.app_role[]))
  with check (public.is_one_of(array['admin','super_admin']::public.app_role[]));

create policy departments_delete_admin
  on public.departments for delete
  to authenticated
  using (public.is_one_of(array['admin','super_admin']::public.app_role[]));

-- Profiles: own row readable/updatable; admin + hr can read all;
-- only admins update others; only super_admin deletes.
-- No INSERT policy: rows are only created by the signup trigger.
create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy profiles_select_privileged
  on public.profiles for select
  to authenticated
  using (public.is_one_of(array['super_admin','admin','hr']::public.app_role[]));

create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_update_admin
  on public.profiles for update
  to authenticated
  using (public.is_one_of(array['admin','super_admin']::public.app_role[]))
  with check (public.is_one_of(array['admin','super_admin']::public.app_role[]));

create policy profiles_delete_super_admin
  on public.profiles for delete
  to authenticated
  using (public.is_one_of(array['super_admin']::public.app_role[]));

-- =============================================================
-- Bootstrap note: after the FIRST user signs up, promote them
-- manually in the Supabase SQL editor (service role bypasses the
-- guard trigger because auth.uid() is null there):
--
--   update public.profiles
--   set role = 'super_admin', is_active = true
--   where email = 'owner@example.com';
-- =============================================================
