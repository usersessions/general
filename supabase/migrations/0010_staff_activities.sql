-- =============================================================
-- Phase 10: Staff Activities Scheduler & Calendar
-- =============================================================

create type public.activity_status as enum ('pending', 'completed');

create table public.staff_activities (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  scheduled_date date not null,
  status public.activity_status not null default 'pending',
  outcome_report text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index staff_activities_profile_date_idx on public.staff_activities (profile_id, scheduled_date);

create trigger staff_activities_set_updated_at before update on public.staff_activities
  for each row execute function public.set_updated_at();

-- ---------- RLS ----------
alter table public.staff_activities enable row level security;

-- Everyone can read their own activities. Managers (admin/hr) can read all activities.
create policy staff_activities_select on public.staff_activities for select to authenticated
  using (
    profile_id = auth.uid() or 
    public.is_one_of(array['admin','super_admin','hr']::public.app_role[])
  );

-- Staff can insert their own activities
create policy staff_activities_insert on public.staff_activities for insert to authenticated
  with check (profile_id = auth.uid());

-- Staff can update their own activities
create policy staff_activities_update on public.staff_activities for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- Staff can delete their own activities (optional, but good for mistakes)
create policy staff_activities_delete on public.staff_activities for delete to authenticated
  using (profile_id = auth.uid());

-- Managers (admin) can update/delete any activity if needed
create policy staff_activities_admin_update on public.staff_activities for update to authenticated
  using (public.is_one_of(array['admin','super_admin']::public.app_role[]));
create policy staff_activities_admin_delete on public.staff_activities for delete to authenticated
  using (public.is_one_of(array['admin','super_admin']::public.app_role[]));
