-- =============================================================
-- Phase 9: Calculator Inventory Integration & Auto Allocation
-- =============================================================

-- 1. Add standard_cost to products for the calculator to use
alter table public.products add column if not exists standard_cost numeric(12,2) not null default 0;

-- 2. Update the v_product_stock view to include standard_cost
drop view if exists public.v_product_stock;
create view public.v_product_stock as
  select p.id, p.name, p.category, p.unit_type, p.tracking_mode, p.default_thickness_mm, p.standard_cost,
    (select count(*) from public.stock_units su where su.product_id = p.id and su.status = 'in_stock') as units_in_stock,
    (select count(*) from public.stock_units su where su.product_id = p.id and su.status = 'offcut') as offcuts_available,
    (select count(*) from public.stock_units su where su.product_id = p.id and su.status = 'reserved') as units_reserved,
    (select coalesce(sum(sb.qty_remaining), 0) from public.stock_batches sb where sb.product_id = p.id) as qty_on_hand
  from public.products p;
grant select on public.v_product_stock to authenticated;

-- 3. Function to auto-allocate and cut stock for a sales order
-- p_items format: [{"product_id": "uuid", "qty": 1, "length_mm": 1200}, ...]
create or replace function public.auto_process_sales_order(
  p_order_id uuid,
  p_items jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_order record;
  v_item jsonb;
  v_prod_id uuid;
  v_qty integer;
  v_req_len integer;
  v_unit public.stock_units%rowtype;
  v_leftover integer;
  v_offcuts jsonb;
  i integer;
begin
  if not public.is_one_of(array['sales','workshop','admin','super_admin']::public.app_role[]) then
    raise exception 'Not authorised';
  end if;

  select * into v_order from sales_orders where id = p_order_id;
  if not found then raise exception 'Order not found'; end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_prod_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'qty')::integer;
    v_req_len := (v_item->>'length_mm')::integer;

    if v_req_len is null then
      -- Count item: just issue stock
      perform public.issue_stock(v_prod_id, v_qty, v_order.order_number, 'Auto-allocated for ' || v_order.order_number);
    else
      -- Dimensional item: need to find pieces and cut them
      for i in 1..v_qty loop
        -- Find smallest piece that fits
        select * into v_unit from public.stock_units 
        where product_id = v_prod_id and status in ('in_stock', 'offcut') and length_mm >= v_req_len
        order by length_mm asc limit 1
        for update;

        if not found then
          raise exception 'Insufficient dimensional stock for product % (needed % mm)', v_prod_id, v_req_len;
        end if;

        v_leftover := v_unit.length_mm - v_req_len;
        if v_leftover > 0 then
          v_offcuts := jsonb_build_array(jsonb_build_object('length_mm', v_leftover));
        else
          v_offcuts := '[]'::jsonb;
        end if;

        perform public.perform_cut(v_unit.id, v_offcuts, v_order.order_number, 'Auto-cut for ' || v_order.order_number);
        
        -- Update the movement to link the sales_order_id
        update public.stock_movements set sales_order_id = p_order_id 
        where stock_unit_id = v_unit.id and movement_type = 'cut' and job_reference = v_order.order_number;
      end loop;
    end if;
  end loop;

  -- Mark order as in_progress (since it is being actively processed/cut)
  update sales_orders set status = 'in_progress' where id = p_order_id;

end; $$;
