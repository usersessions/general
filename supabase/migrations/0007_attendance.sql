-- =============================================================
-- Phase 7: Attendance via QR kiosk
-- The attendance table is clock-in-method agnostic: a future mobile
-- method only needs to call record_attendance_scan (or insert rows
-- with a different kiosk_device_id semantic) - no schema change.
-- =============================================================

create table public.kiosk_devices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  device_key uuid not null unique default gen_random_uuid(),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.employee_badges (
  id uuid primary key default gen_random_uuid(), -- this UUID is the QR content
  profile_id uuid not null references public.profiles (id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index employee_badges_profile_idx on public.employee_badges (profile_id);

create type public.attendance_direction as enum ('in','out');

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id),
  scanned_at timestamptz not null default now(),
  direction public.attendance_direction not null,
  kiosk_device_id uuid references public.kiosk_devices (id),
  created_at timestamptz not null default now()
);
create index attendance_employee_idx on public.attendance (employee_id, scanned_at desc);

-- ---------- RLS ----------
alter table public.kiosk_devices enable row level security;
alter table public.employee_badges enable row level security;
alter table public.attendance enable row level security;

create policy kiosks_admin on public.kiosk_devices for all to authenticated
  using (public.is_one_of(array['hr','admin','super_admin']::public.app_role[]))
  with check (public.is_one_of(array['hr','admin','super_admin']::public.app_role[]));

create policy badges_hr on public.employee_badges for all to authenticated
  using (public.is_one_of(array['hr','admin','super_admin']::public.app_role[]))
  with check (public.is_one_of(array['hr','admin','super_admin']::public.app_role[]));
create policy badges_own_select on public.employee_badges for select to authenticated
  using (profile_id = auth.uid());

create policy attendance_select_privileged on public.attendance for select to authenticated
  using (public.is_one_of(array['hr','admin','super_admin']::public.app_role[]));
create policy attendance_select_own on public.attendance for select to authenticated
  using (employee_id = auth.uid());
-- No insert policy: rows only via record_attendance_scan (service role).

-- ---------- Scan handler ----------
-- Duplicate-scan protection: a second scan within 60 seconds is ignored.
create or replace function public.record_attendance_scan(
  p_badge_id uuid,
  p_device_key uuid
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_device_id uuid;
  v_employee uuid;
  v_name text;
  v_last record;
  v_direction public.attendance_direction;
begin
  select id into v_device_id from kiosk_devices where device_key = p_device_key and active;
  if v_device_id is null then
    return jsonb_build_object('status', 'error', 'message', 'Unknown or inactive kiosk device');
  end if;

  select b.profile_id, p.full_name into v_employee, v_name
  from employee_badges b join profiles p on p.id = b.profile_id
  where b.id = p_badge_id and b.active and p.is_active;
  if v_employee is null then
    return jsonb_build_object('status', 'error', 'message', 'Unknown or inactive badge');
  end if;

  select direction, scanned_at into v_last
  from attendance where employee_id = v_employee
  order by scanned_at desc limit 1;

  if v_last.scanned_at is not null and v_last.scanned_at > now() - interval '60 seconds' then
    return jsonb_build_object('status', 'duplicate', 'name', v_name,
      'message', 'Scan ignored: duplicate within 60 seconds');
  end if;

  if v_last.scanned_at is not null
     and v_last.scanned_at::date = current_date
     and v_last.direction = 'in' then
    v_direction := 'out';
  else
    v_direction := 'in';
  end if;

  insert into attendance (employee_id, direction, kiosk_device_id)
  values (v_employee, v_direction, v_device_id);

  return jsonb_build_object('status', 'ok', 'name', v_name, 'direction', v_direction);
end; $$;
