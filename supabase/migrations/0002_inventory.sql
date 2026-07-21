-- =============================================================
-- Phase 2: Product catalogue & stock-unit inventory
-- Dimensional items get one stock_units row per physical piece;
-- cuts consume the original and create offcut rows with lineage.
-- Count items use qty on stock_batches. Cost prices are visible
-- only to finance/admin/super_admin.
-- =============================================================

create type public.product_category as enum ('glass','aluminium','upvc','hardware','consumable');
create type public.tracking_mode as enum ('dimensional','count');
create type public.stock_unit_status as enum ('in_stock','reserved','consumed','offcut');
create type public.movement_type as enum ('receive','issue','cut','return','writeoff','reserve','release');

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category public.product_category not null,
  unit_type text not null default 'pcs',
  tracking_mode public.tracking_mode not null,
  default_thickness_mm integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create table public.stock_batches (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id),
  supplier_name text,
  received_at date not null default current_date,
  unit_cost numeric(12,2) not null check (unit_cost >= 0),
  qty_received integer not null check (qty_received > 0),
  qty_remaining integer not null default 0 check (qty_remaining >= 0), -- count-mode only
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index stock_batches_product_idx on public.stock_batches (product_id);

create table public.stock_units (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id),
  batch_id uuid not null references public.stock_batches (id),
  length_mm integer not null check (length_mm > 0),
  width_mm integer check (width_mm > 0),      -- null for linear items (bars)
  thickness_mm integer check (thickness_mm > 0),
  status public.stock_unit_status not null default 'in_stock',
  parent_unit_id uuid references public.stock_units (id), -- offcut lineage
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index stock_units_product_status_idx on public.stock_units (product_id, status);
create index stock_units_parent_idx on public.stock_units (parent_unit_id);

create trigger stock_units_set_updated_at before update on public.stock_units
  for each row execute function public.set_updated_at();

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id),
  stock_unit_id uuid references public.stock_units (id),
  batch_id uuid references public.stock_batches (id),
  movement_type public.movement_type not null,
  quantity integer,               -- count-mode movements
  job_reference text,             -- free text; sales_order_id added in Phase 3
  performed_by uuid not null references public.profiles (id),
  notes text,
  created_at timestamptz not null default now()
);
create index stock_movements_product_idx on public.stock_movements (product_id);
create index stock_movements_batch_idx on public.stock_movements (batch_id);

-- ---------- RLS ----------
alter table public.products enable row level security;
alter table public.stock_batches enable row level security;
alter table public.stock_units enable row level security;
alter table public.stock_movements enable row level security;

create policy products_select on public.products for select to authenticated using (true);
create policy products_write on public.products for insert to authenticated
  with check (public.is_one_of(array['procurement','admin','super_admin']::public.app_role[]));
create policy products_update on public.products for update to authenticated
  using (public.is_one_of(array['procurement','admin','super_admin']::public.app_role[]))
  with check (public.is_one_of(array['procurement','admin','super_admin']::public.app_role[]));
create policy products_delete on public.products for delete to authenticated
  using (public.is_one_of(array['admin','super_admin']::public.app_role[]));

-- Cost prices: only finance/admin/super_admin may read stock_batches directly.
create policy stock_batches_select_cost on public.stock_batches for select to authenticated
  using (public.is_one_of(array['finance','admin','super_admin']::public.app_role[]));
create policy stock_batches_admin_write on public.stock_batches for all to authenticated
  using (public.is_one_of(array['admin','super_admin']::public.app_role[]))
  with check (public.is_one_of(array['admin','super_admin']::public.app_role[]));

create policy stock_units_select on public.stock_units for select to authenticated using (true);
create policy stock_units_admin_write on public.stock_units for all to authenticated
  using (public.is_one_of(array['admin','super_admin']::public.app_role[]))
  with check (public.is_one_of(array['admin','super_admin']::public.app_role[]));

create policy stock_movements_select on public.stock_movements for select to authenticated using (true);
create policy stock_movements_admin_write on public.stock_movements for insert to authenticated
  with check (public.is_one_of(array['admin','super_admin']::public.app_role[]));

-- Cost-free batch view for non-finance roles (owner view: bypasses base RLS
-- deliberately; exposes NO cost columns).
create view public.stock_batches_safe as
  select id, product_id, supplier_name, received_at, qty_received, qty_remaining, created_at
  from public.stock_batches;
grant select on public.stock_batches_safe to authenticated;

create view public.v_product_stock as
  select p.id, p.name, p.category, p.unit_type, p.tracking_mode, p.default_thickness_mm,
    (select count(*) from public.stock_units su where su.product_id = p.id and su.status = 'in_stock') as units_in_stock,
    (select count(*) from public.stock_units su where su.product_id = p.id and su.status = 'offcut') as offcuts_available,
    (select count(*) from public.stock_units su where su.product_id = p.id and su.status = 'reserved') as units_reserved,
    (select coalesce(sum(sb.qty_remaining), 0) from public.stock_batches sb where sb.product_id = p.id) as qty_on_hand
  from public.products p;
grant select on public.v_product_stock to authenticated;

-- ---------- Stock operations (SECURITY DEFINER gateways with role checks;
-- these are the only sanctioned write paths for non-admin roles) ----------

create or replace function public.assert_stock_operator()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_one_of(array['workshop','procurement','admin','super_admin']::public.app_role[]) then
    raise exception 'Not authorised for stock operations';
  end if;
end; $$;

create or replace function public.receive_batch(
  p_product_id uuid,
  p_supplier_name text,
  p_unit_cost numeric,
  p_qty integer,
  p_length_mm integer default null,
  p_width_mm integer default null,
  p_thickness_mm integer default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_mode public.tracking_mode;
  v_batch_id uuid;
  i integer;
begin
  perform public.assert_stock_operator();
  select tracking_mode into v_mode from public.products where id = p_product_id;
  if v_mode is null then raise exception 'Unknown product'; end if;
  if p_qty <= 0 then raise exception 'Quantity must be positive'; end if;

  insert into public.stock_batches (product_id, supplier_name, unit_cost, qty_received, qty_remaining, created_by)
  values (p_product_id, p_supplier_name, p_unit_cost, p_qty,
          case when v_mode = 'count' then p_qty else 0 end, auth.uid())
  returning id into v_batch_id;

  if v_mode = 'dimensional' then
    if p_length_mm is null then raise exception 'length_mm is required for dimensional products'; end if;
    for i in 1..p_qty loop
      insert into public.stock_units (product_id, batch_id, length_mm, width_mm, thickness_mm)
      values (p_product_id, v_batch_id, p_length_mm, p_width_mm, p_thickness_mm);
    end loop;
  end if;

  insert into public.stock_movements (product_id, batch_id, movement_type, quantity, performed_by, notes)
  values (p_product_id, v_batch_id, 'receive', p_qty, auth.uid(), p_supplier_name);

  return v_batch_id;
end; $$;

create or replace function public.perform_cut(
  p_unit_id uuid,
  p_offcuts jsonb default '[]'::jsonb,   -- [{"length_mm":900,"width_mm":400}]
  p_job_reference text default null,
  p_notes text default null
) returns setof public.stock_units
language plpgsql security definer set search_path = public as $$
declare
  v_unit public.stock_units%rowtype;
  v_offcut jsonb;
  v_new public.stock_units%rowtype;
begin
  perform public.assert_stock_operator();
  select * into v_unit from public.stock_units where id = p_unit_id for update;
  if not found then raise exception 'Stock unit not found'; end if;
  if v_unit.status not in ('in_stock','offcut','reserved') then
    raise exception 'Unit cannot be cut (status: %)', v_unit.status;
  end if;

  update public.stock_units set status = 'consumed' where id = p_unit_id;

  insert into public.stock_movements (product_id, stock_unit_id, batch_id, movement_type, job_reference, performed_by, notes)
  values (v_unit.product_id, p_unit_id, v_unit.batch_id, 'cut', p_job_reference, auth.uid(), p_notes);

  for v_offcut in select * from jsonb_array_elements(coalesce(p_offcuts, '[]'::jsonb)) loop
    insert into public.stock_units (product_id, batch_id, length_mm, width_mm, thickness_mm, status, parent_unit_id)
    values (
      v_unit.product_id,
      v_unit.batch_id,   -- lineage back to purchase batch preserved
      (v_offcut ->> 'length_mm')::integer,
      nullif(v_offcut ->> 'width_mm', '')::integer,
      coalesce(nullif(v_offcut ->> 'thickness_mm', '')::integer, v_unit.thickness_mm),
      'offcut',
      p_unit_id
    ) returning * into v_new;
    return next v_new;
  end loop;
  return;
end; $$;

create or replace function public.issue_stock(
  p_product_id uuid,
  p_qty integer,
  p_job_reference text default null,
  p_notes text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_batch record;
  v_left integer := p_qty;
  v_take integer;
begin
  perform public.assert_stock_operator();
  if p_qty <= 0 then raise exception 'Quantity must be positive'; end if;
  for v_batch in
    select id, qty_remaining from public.stock_batches
    where product_id = p_product_id and qty_remaining > 0
    order by received_at, created_at
    for update
  loop
    exit when v_left = 0;
    v_take := least(v_batch.qty_remaining, v_left);
    update public.stock_batches set qty_remaining = qty_remaining - v_take where id = v_batch.id;
    insert into public.stock_movements (product_id, batch_id, movement_type, quantity, job_reference, performed_by, notes)
    values (p_product_id, v_batch.id, 'issue', v_take, p_job_reference, auth.uid(), p_notes);
    v_left := v_left - v_take;
  end loop;
  if v_left > 0 then raise exception 'Insufficient stock: short by %', v_left; end if;
end; $$;
