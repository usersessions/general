-- =============================================================
-- Phase 8: Procurement workflow
-- Separation of duties: procurement creates POs, only finance/admin
-- approves, receiving turns an approved PO into stock batches/units
-- and posts the purchase journal entry.
-- =============================================================

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  phone text,
  email text,
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);

create type public.po_status as enum ('draft','pending_approval','approved','rejected','received','cancelled');
create sequence public.po_number_seq;

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique default ('PO-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.po_number_seq')::text, 4, '0')),
  supplier_id uuid not null references public.suppliers (id),
  status public.po_status not null default 'draft',
  notes text,
  created_by uuid references public.profiles (id) default auth.uid(),
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger purchase_orders_set_updated_at before update on public.purchase_orders
  for each row execute function public.set_updated_at();

create table public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders (id) on delete cascade,
  product_id uuid not null references public.products (id),
  description text,
  qty integer not null check (qty > 0),
  unit_cost numeric(12,2) not null check (unit_cost >= 0),
  length_mm integer,
  width_mm integer,
  thickness_mm integer
);

alter table public.stock_batches add column purchase_order_id uuid references public.purchase_orders (id);

-- ---------- RLS ----------
alter table public.suppliers enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;

create policy suppliers_select on public.suppliers for select to authenticated
  using (public.is_one_of(array['procurement','finance','workshop','admin','super_admin']::public.app_role[]));
create policy suppliers_write on public.suppliers for all to authenticated
  using (public.is_one_of(array['procurement','admin','super_admin']::public.app_role[]))
  with check (public.is_one_of(array['procurement','admin','super_admin']::public.app_role[]));

create policy po_select on public.purchase_orders for select to authenticated
  using (public.is_one_of(array['procurement','finance','workshop','admin','super_admin']::public.app_role[]));
create policy po_insert on public.purchase_orders for insert to authenticated
  with check (public.is_one_of(array['procurement','admin','super_admin']::public.app_role[]));
create policy po_update on public.purchase_orders for update to authenticated
  using (public.is_one_of(array['procurement','finance','admin','super_admin']::public.app_role[]))
  with check (public.is_one_of(array['procurement','finance','admin','super_admin']::public.app_role[]));

create policy po_items_select on public.purchase_order_items for select to authenticated
  using (public.is_one_of(array['procurement','finance','workshop','admin','super_admin']::public.app_role[]));
create policy po_items_write on public.purchase_order_items for all to authenticated
  using (public.is_one_of(array['procurement','admin','super_admin']::public.app_role[]))
  with check (public.is_one_of(array['procurement','admin','super_admin']::public.app_role[]));

-- Status-transition guard: procurement can submit/cancel, ONLY finance/admin
-- can approve or reject. 'received' is set only by receive_purchase_order().
create or replace function public.guard_po_transitions()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if; -- service role / internal
  if new.status is distinct from old.status then
    if new.status in ('approved','rejected') then
      if not public.is_one_of(array['finance','admin','super_admin']::public.app_role[]) then
        raise exception 'Only finance or admin may approve/reject purchase orders';
      end if;
      new.approved_by = auth.uid();
      new.approved_at = now();
    elsif new.status = 'pending_approval' then
      if old.status <> 'draft' then raise exception 'Only draft POs can be submitted'; end if;
    elsif new.status = 'cancelled' then
      if old.status in ('received') then raise exception 'Received POs cannot be cancelled'; end if;
    elsif new.status = 'received' then
      raise exception 'Use receive_purchase_order() to receive a PO';
    end if;
  end if;
  return new;
end; $$;

create trigger purchase_orders_guard before update on public.purchase_orders
  for each row execute function public.guard_po_transitions();

-- Receiving: approved PO -> stock batches/units + purchases (journal via trigger).
create or replace function public.receive_purchase_order(p_po_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_po public.purchase_orders%rowtype;
  v_supplier text;
  v_item record;
  v_mode public.tracking_mode;
  v_batch_id uuid;
  v_total numeric(14,2) := 0;
  i integer;
begin
  if not public.is_one_of(array['procurement','workshop','admin','super_admin']::public.app_role[]) then
    raise exception 'Not authorised';
  end if;
  select * into v_po from purchase_orders where id = p_po_id for update;
  if not found then raise exception 'PO not found'; end if;
  if v_po.status <> 'approved' then raise exception 'PO must be approved before receiving (status: %)', v_po.status; end if;
  select name into v_supplier from suppliers where id = v_po.supplier_id;

  for v_item in select * from purchase_order_items where purchase_order_id = p_po_id loop
    select tracking_mode into v_mode from products where id = v_item.product_id;

    insert into stock_batches (product_id, supplier_name, unit_cost, qty_received, qty_remaining, created_by, purchase_order_id)
    values (v_item.product_id, v_supplier, v_item.unit_cost, v_item.qty,
            case when v_mode = 'count' then v_item.qty else 0 end, auth.uid(), p_po_id)
    returning id into v_batch_id;

    if v_mode = 'dimensional' then
      if v_item.length_mm is null then
        raise exception 'PO item for dimensional product missing length_mm';
      end if;
      for i in 1..v_item.qty loop
        insert into stock_units (product_id, batch_id, length_mm, width_mm, thickness_mm)
        values (v_item.product_id, v_batch_id, v_item.length_mm, v_item.width_mm, v_item.thickness_mm);
      end loop;
    end if;

    insert into stock_movements (product_id, batch_id, movement_type, quantity, performed_by, notes)
    values (v_item.product_id, v_batch_id, 'receive', v_item.qty, auth.uid(), 'PO ' || v_po.po_number);

    insert into purchases (batch_id, supplier_name, amount, notes, created_by)
    values (v_batch_id, v_supplier, v_item.qty * v_item.unit_cost, 'PO ' || v_po.po_number, auth.uid());

    v_total := v_total + v_item.qty * v_item.unit_cost;
  end loop;

  if v_total = 0 then raise exception 'PO has no items'; end if;

  -- direct update bypasses the guard's 'received' block (function is the sanctioned path)
  update purchase_orders set status = 'received' where id = p_po_id;
end; $$;

-- Allow the receive function's own status update through the guard.
create or replace function public.guard_po_transitions()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if new.status is distinct from old.status then
    if new.status in ('approved','rejected') then
      if not public.is_one_of(array['finance','admin','super_admin']::public.app_role[]) then
        raise exception 'Only finance or admin may approve/reject purchase orders';
      end if;
      new.approved_by = auth.uid();
      new.approved_at = now();
    elsif new.status = 'pending_approval' then
      if old.status <> 'draft' then raise exception 'Only draft POs can be submitted'; end if;
    elsif new.status = 'cancelled' then
      if old.status = 'received' then raise exception 'Received POs cannot be cancelled'; end if;
    elsif new.status = 'received' then
      if not public.is_one_of(array['procurement','workshop','admin','super_admin']::public.app_role[]) then
        raise exception 'Not authorised to receive';
      end if;
      if old.status <> 'approved' then raise exception 'Only approved POs can be received'; end if;
    end if;
  end if;
  return new;
end; $$;

-- PO totals (invoker: respects PO RLS; excludes nothing since PO viewers may see PO costs)
create view public.v_po_totals with (security_invoker = true) as
  select po.id as purchase_order_id,
    coalesce(sum(i.qty * i.unit_cost), 0)::numeric(14,2) as total
  from public.purchase_orders po
  left join public.purchase_order_items i on i.purchase_order_id = po.id
  group by po.id;
grant select on public.v_po_totals to authenticated;
