-- =============================================================
-- Phase 3: Quotation -> Sales Order -> Invoice pipeline
-- =============================================================

create type public.quotation_status as enum ('draft','sent','accepted','rejected','expired');
create type public.order_status as enum ('open','in_progress','delivered','cancelled');
create type public.invoice_status as enum ('draft','issued','partially_paid','paid','void');

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  location text, -- Mombasa / Kilifi / Lamu / Taita etc.
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);

create sequence public.quotation_number_seq;
create sequence public.sales_order_number_seq;
create sequence public.invoice_number_seq;

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  quote_number text not null unique default ('Q-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.quotation_number_seq')::text, 4, '0')),
  client_id uuid not null references public.clients (id),
  status public.quotation_status not null default 'draft',
  valid_until date,
  vat_rate numeric(5,2) not null default 16,
  notes text,
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger quotations_set_updated_at before update on public.quotations
  for each row execute function public.set_updated_at();

create table public.quotation_line_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations (id) on delete cascade,
  product_id uuid references public.products (id),
  description text not null,
  qty numeric(12,2) not null check (qty > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0)
);

create table public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('SO-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.sales_order_number_seq')::text, 4, '0')),
  quotation_id uuid unique references public.quotations (id),
  client_id uuid not null references public.clients (id),
  status public.order_status not null default 'open',
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.sales_order_reservations (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references public.sales_orders (id) on delete cascade,
  stock_unit_id uuid not null unique references public.stock_units (id),
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.sales_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique default ('INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.invoice_number_seq')::text, 4, '0')),
  sales_order_id uuid references public.sales_orders (id),
  client_id uuid not null references public.clients (id),
  status public.invoice_status not null default 'draft',
  issued_at timestamptz,
  due_date date,
  vat_rate numeric(5,2) not null default 16,
  amount_paid numeric(12,2) not null default 0,
  notes text,
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger sales_invoices_set_updated_at before update on public.sales_invoices
  for each row execute function public.set_updated_at();

create table public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.sales_invoices (id) on delete cascade,
  product_id uuid references public.products (id),
  description text not null,
  qty numeric(12,2) not null check (qty > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0)
);

-- Link stock movements to sales orders (job costing in Phase 5)
alter table public.stock_movements add column sales_order_id uuid references public.sales_orders (id);
create index stock_movements_order_idx on public.stock_movements (sales_order_id);

-- Totals views (security_invoker: base-table RLS applies)
create view public.v_quotation_totals with (security_invoker = true) as
  select q.id as quotation_id,
    coalesce(sum(l.qty * l.unit_price), 0)::numeric(12,2) as subtotal,
    round(coalesce(sum(l.qty * l.unit_price), 0) * q.vat_rate / 100, 2) as vat_amount,
    round(coalesce(sum(l.qty * l.unit_price), 0) * (1 + q.vat_rate / 100), 2) as total
  from public.quotations q
  left join public.quotation_line_items l on l.quotation_id = q.id
  group by q.id, q.vat_rate;

create view public.v_invoice_totals with (security_invoker = true) as
  select i.id as invoice_id,
    coalesce(sum(l.qty * l.unit_price), 0)::numeric(12,2) as subtotal,
    round(coalesce(sum(l.qty * l.unit_price), 0) * i.vat_rate / 100, 2) as vat_amount,
    round(coalesce(sum(l.qty * l.unit_price), 0) * (1 + i.vat_rate / 100), 2) as total
  from public.sales_invoices i
  left join public.invoice_line_items l on l.invoice_id = i.id
  group by i.id, i.vat_rate;

grant select on public.v_quotation_totals, public.v_invoice_totals to authenticated;

-- ---------- RLS ----------
alter table public.clients enable row level security;
alter table public.quotations enable row level security;
alter table public.quotation_line_items enable row level security;
alter table public.sales_orders enable row level security;
alter table public.sales_order_reservations enable row level security;
alter table public.sales_invoices enable row level security;
alter table public.invoice_line_items enable row level security;

create policy clients_select on public.clients for select to authenticated using (true);
create policy clients_write on public.clients for insert to authenticated
  with check (public.is_one_of(array['sales','admin','super_admin']::public.app_role[]));
create policy clients_update on public.clients for update to authenticated
  using (public.is_one_of(array['sales','admin','super_admin']::public.app_role[]))
  with check (public.is_one_of(array['sales','admin','super_admin']::public.app_role[]));

create policy quotations_select on public.quotations for select to authenticated
  using (public.is_one_of(array['sales','finance','admin','super_admin']::public.app_role[]));
create policy quotations_insert on public.quotations for insert to authenticated
  with check (public.is_one_of(array['sales','admin','super_admin']::public.app_role[]));
create policy quotations_update on public.quotations for update to authenticated
  using (public.is_one_of(array['sales','admin','super_admin']::public.app_role[]))
  with check (public.is_one_of(array['sales','admin','super_admin']::public.app_role[]));

create policy quotation_lines_select on public.quotation_line_items for select to authenticated
  using (public.is_one_of(array['sales','finance','admin','super_admin']::public.app_role[]));
create policy quotation_lines_write on public.quotation_line_items for all to authenticated
  using (public.is_one_of(array['sales','admin','super_admin']::public.app_role[]))
  with check (public.is_one_of(array['sales','admin','super_admin']::public.app_role[]));

-- Workshop can see orders (their job list) but not create them directly.
create policy sales_orders_select on public.sales_orders for select to authenticated using (true);
create policy sales_orders_admin_write on public.sales_orders for all to authenticated
  using (public.is_one_of(array['admin','super_admin']::public.app_role[]))
  with check (public.is_one_of(array['admin','super_admin']::public.app_role[]));

create policy reservations_select on public.sales_order_reservations for select to authenticated using (true);
create policy reservations_admin_write on public.sales_order_reservations for all to authenticated
  using (public.is_one_of(array['admin','super_admin']::public.app_role[]))
  with check (public.is_one_of(array['admin','super_admin']::public.app_role[]));

create policy invoices_select on public.sales_invoices for select to authenticated
  using (public.is_one_of(array['sales','finance','admin','super_admin']::public.app_role[]));
create policy invoices_write on public.sales_invoices for insert to authenticated
  with check (public.is_one_of(array['finance','sales','admin','super_admin']::public.app_role[]));
create policy invoices_update on public.sales_invoices for update to authenticated
  using (public.is_one_of(array['finance','admin','super_admin']::public.app_role[]))
  with check (public.is_one_of(array['finance','admin','super_admin']::public.app_role[]));

create policy invoice_lines_select on public.invoice_line_items for select to authenticated
  using (public.is_one_of(array['sales','finance','admin','super_admin']::public.app_role[]));
create policy invoice_lines_write on public.invoice_line_items for all to authenticated
  using (public.is_one_of(array['finance','sales','admin','super_admin']::public.app_role[]))
  with check (public.is_one_of(array['finance','sales','admin','super_admin']::public.app_role[]));

-- ---------- Pipeline functions ----------

create or replace function public.accept_quotation(p_quotation_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_q public.quotations%rowtype; v_order_id uuid;
begin
  if not public.is_one_of(array['sales','admin','super_admin']::public.app_role[]) then
    raise exception 'Not authorised';
  end if;
  select * into v_q from quotations where id = p_quotation_id for update;
  if not found then raise exception 'Quotation not found'; end if;
  if v_q.status not in ('draft','sent') then
    raise exception 'Quotation cannot be accepted (status: %)', v_q.status;
  end if;
  update quotations set status = 'accepted' where id = p_quotation_id;
  insert into sales_orders (quotation_id, client_id, created_by)
  values (p_quotation_id, v_q.client_id, auth.uid())
  returning id into v_order_id;
  return v_order_id;
end; $$;

create or replace function public.reserve_stock_unit(p_order_id uuid, p_unit_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_status public.stock_unit_status;
begin
  if not public.is_one_of(array['sales','workshop','procurement','admin','super_admin']::public.app_role[]) then
    raise exception 'Not authorised';
  end if;
  select status into v_status from stock_units where id = p_unit_id for update;
  if v_status is null then raise exception 'Stock unit not found'; end if;
  if v_status not in ('in_stock','offcut') then
    raise exception 'Unit not available (status: %)', v_status;
  end if;
  update stock_units set status = 'reserved' where id = p_unit_id;
  insert into sales_order_reservations (sales_order_id, stock_unit_id, created_by)
  values (p_order_id, p_unit_id, auth.uid());
  insert into stock_movements (product_id, stock_unit_id, batch_id, movement_type, sales_order_id, performed_by)
  select product_id, id, batch_id, 'reserve', p_order_id, auth.uid() from stock_units where id = p_unit_id;
end; $$;

create or replace function public.release_stock_unit(p_unit_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_res record; v_was_offcut boolean;
begin
  if not public.is_one_of(array['sales','workshop','procurement','admin','super_admin']::public.app_role[]) then
    raise exception 'Not authorised';
  end if;
  select * into v_res from sales_order_reservations where stock_unit_id = p_unit_id;
  if not found then raise exception 'Unit is not reserved'; end if;
  select parent_unit_id is not null into v_was_offcut from stock_units where id = p_unit_id;
  update stock_units set status = case when v_was_offcut then 'offcut' else 'in_stock' end::public.stock_unit_status
    where id = p_unit_id;
  delete from sales_order_reservations where stock_unit_id = p_unit_id;
  insert into stock_movements (product_id, stock_unit_id, batch_id, movement_type, sales_order_id, performed_by)
  select product_id, id, batch_id, 'release', v_res.sales_order_id, auth.uid() from stock_units where id = p_unit_id;
end; $$;

create or replace function public.deliver_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_res record;
begin
  if not public.is_one_of(array['sales','workshop','admin','super_admin']::public.app_role[]) then
    raise exception 'Not authorised';
  end if;
  perform 1 from sales_orders where id = p_order_id and status in ('open','in_progress') for update;
  if not found then raise exception 'Order not found or not open'; end if;
  for v_res in select r.stock_unit_id, su.product_id, su.batch_id
               from sales_order_reservations r join stock_units su on su.id = r.stock_unit_id
               where r.sales_order_id = p_order_id loop
    update stock_units set status = 'consumed' where id = v_res.stock_unit_id;
    insert into stock_movements (product_id, stock_unit_id, batch_id, movement_type, sales_order_id, performed_by)
    values (v_res.product_id, v_res.stock_unit_id, v_res.batch_id, 'issue', p_order_id, auth.uid());
  end loop;
  update sales_orders set status = 'delivered' where id = p_order_id;
end; $$;

create or replace function public.create_invoice_from_order(p_order_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_order public.sales_orders%rowtype; v_vat numeric(5,2) := 16; v_invoice_id uuid;
begin
  if not public.is_one_of(array['sales','finance','admin','super_admin']::public.app_role[]) then
    raise exception 'Not authorised';
  end if;
  select * into v_order from sales_orders where id = p_order_id;
  if not found then raise exception 'Order not found'; end if;
  if v_order.quotation_id is not null then
    select vat_rate into v_vat from quotations where id = v_order.quotation_id;
  end if;
  insert into sales_invoices (sales_order_id, client_id, vat_rate, due_date, created_by)
  values (p_order_id, v_order.client_id, v_vat, current_date + 30, auth.uid())
  returning id into v_invoice_id;
  if v_order.quotation_id is not null then
    insert into invoice_line_items (invoice_id, product_id, description, qty, unit_price)
    select v_invoice_id, product_id, description, qty, unit_price
    from quotation_line_items where quotation_id = v_order.quotation_id;
  end if;
  return v_invoice_id;
end; $$;

create or replace function public.issue_invoice(p_invoice_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_one_of(array['sales','finance','admin','super_admin']::public.app_role[]) then
    raise exception 'Not authorised';
  end if;
  update sales_invoices
  set status = 'issued', issued_at = now(), due_date = coalesce(due_date, current_date + 30)
  where id = p_invoice_id and status = 'draft';
  if not found then raise exception 'Invoice not found or not draft'; end if;
end; $$;
