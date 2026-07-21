-- =============================================================
-- DEMO SEED DATA - I&S General Supplies Ltd
-- For client presentations only. NOT for production.
--
-- How to run:
--   1. Apply migrations 0001-0008 first.
--   2. Sign up at least one user and activate them
--      (role super_admin or admin recommended).
--   3. Paste this whole file into the Supabase SQL editor and run ONCE.
--      (Not idempotent - running twice duplicates data.)
--
-- Everything is inserted through the same triggers the app uses, so
-- journals, invoice status, aging and the eTIMS queue all populate
-- exactly as they would in real use.
-- =============================================================

do $$
declare
  v_user uuid;
  d_workshop uuid; d_sales uuid; d_admin uuid;
  c_nyali uuid; c_kilifi uuid; c_taita uuid;
  s_coast uuid; s_alutech uuid; s_hardware uuid;
  p_glass6 uuid; p_tough10 uuid; p_alu uuid; p_upvc uuid; p_silicone uuid; p_screws uuid;
  b_glass6 uuid; b_tough uuid; b_alu uuid; b_upvc uuid; b_sil uuid; b_scr uuid;
  u_g1 uuid; u_g2 uuid; u_g3 uuid; u_a1 uuid;
  q1 uuid; q2 uuid; q3 uuid; q4 uuid;
  so1 uuid; so2 uuid;
  inv1 uuid; inv2 uuid;
  kiosk_id uuid; badge_id uuid;
  po1 uuid; po2 uuid; po3 uuid;
  i integer;
begin
  -- Anchor rows on the first active user
  select id into v_user from public.profiles where is_active order by created_at limit 1;
  if v_user is null then select id into v_user from public.profiles order by created_at limit 1; end if;
  if v_user is null then raise exception 'Sign up and activate a user before running the demo seed'; end if;

  select id into d_workshop from public.departments where name = 'Workshop';
  select id into d_sales from public.departments where name = 'Sales';
  select id into d_admin from public.departments where name = 'Administration';

  -- ---------- Clients ----------
  insert into public.clients (name, email, phone, location, created_by) values
    ('Nyali Beach Villas Ltd', 'projects@nyalibeachvillas.co.ke', '+254 722 315 890', 'Nyali, Mombasa', v_user)
    returning id into c_nyali;
  insert into public.clients (name, email, phone, location, created_by) values
    ('Kilifi Creek Apartments', 'admin@kilificreek.co.ke', '+254 733 442 118', 'Kilifi', v_user)
    returning id into c_kilifi;
  insert into public.clients (name, email, phone, location, created_by) values
    ('Taita Hills Safari Lodge', 'maintenance@taitahillslodge.com', '+254 741 095 662', 'Taita Taveta', v_user)
    returning id into c_taita;

  -- ---------- Suppliers ----------
  insert into public.suppliers (name, contact_person, phone, email, created_by) values
    ('Coast Glass Distributors', 'Hassan Omar', '+254 720 118 344', 'sales@coastglass.co.ke', v_user)
    returning id into s_coast;
  insert into public.suppliers (name, contact_person, phone, email, created_by) values
    ('Alutech Kenya Ltd', 'Grace Wanjiru', '+254 711 902 553', 'orders@alutech.co.ke', v_user)
    returning id into s_alutech;
  insert into public.suppliers (name, contact_person, phone, email, created_by) values
    ('Mombasa Hardware Wholesalers', 'Vipul Shah', '+254 722 664 201', 'info@mombasahardware.co.ke', v_user)
    returning id into s_hardware;

  -- ---------- Products ----------
  insert into public.products (name, category, unit_type, tracking_mode, default_thickness_mm)
    values ('Clear Float Glass 6mm', 'glass', 'sheet', 'dimensional', 6) returning id into p_glass6;
  insert into public.products (name, category, unit_type, tracking_mode, default_thickness_mm)
    values ('Toughened Glass 10mm', 'glass', 'sheet', 'dimensional', 10) returning id into p_tough10;
  insert into public.products (name, category, unit_type, tracking_mode)
    values ('Aluminium Box Profile 100×50', 'aluminium', 'bar', 'dimensional') returning id into p_alu;
  insert into public.products (name, category, unit_type, tracking_mode)
    values ('UPVC Window Profile 60mm', 'upvc', 'bar', 'dimensional') returning id into p_upvc;
  insert into public.products (name, category, unit_type, tracking_mode)
    values ('Silicone Sealant Clear 280ml', 'consumable', 'pcs', 'count') returning id into p_silicone;
  insert into public.products (name, category, unit_type, tracking_mode)
    values ('SS Self-Drilling Screws 25mm (box 500)', 'hardware', 'box', 'count') returning id into p_screws;

  -- ---------- Batches (with purchases -> Inventory/AP journals) ----------
  insert into public.stock_batches (product_id, supplier_name, received_at, unit_cost, qty_received, qty_remaining, created_by)
    values (p_glass6, 'Coast Glass Distributors', current_date - 21, 3200, 10, 0, v_user) returning id into b_glass6;
  insert into public.stock_batches (product_id, supplier_name, received_at, unit_cost, qty_received, qty_remaining, created_by)
    values (p_tough10, 'Coast Glass Distributors', current_date - 14, 12500, 4, 0, v_user) returning id into b_tough;
  insert into public.stock_batches (product_id, supplier_name, received_at, unit_cost, qty_received, qty_remaining, created_by)
    values (p_alu, 'Alutech Kenya Ltd', current_date - 18, 1450, 20, 0, v_user) returning id into b_alu;
  insert into public.stock_batches (product_id, supplier_name, received_at, unit_cost, qty_received, qty_remaining, created_by)
    values (p_upvc, 'Alutech Kenya Ltd', current_date - 10, 1100, 15, 0, v_user) returning id into b_upvc;
  insert into public.stock_batches (product_id, supplier_name, received_at, unit_cost, qty_received, qty_remaining, created_by)
    values (p_silicone, 'Mombasa Hardware Wholesalers', current_date - 9, 350, 48, 40, v_user) returning id into b_sil;
  insert into public.stock_batches (product_id, supplier_name, received_at, unit_cost, qty_received, qty_remaining, created_by)
    values (p_screws, 'Mombasa Hardware Wholesalers', current_date - 9, 550, 25, 22, v_user) returning id into b_scr;

  insert into public.purchases (batch_id, supplier_name, amount, purchase_date, notes, created_by) values
    (b_glass6, 'Coast Glass Distributors', 32000, current_date - 21, 'Cash purchase pending settlement', v_user),
    (b_alu, 'Alutech Kenya Ltd', 29000, current_date - 18, '30-day terms', v_user);

  insert into public.stock_movements (product_id, batch_id, movement_type, quantity, performed_by, notes) values
    (p_glass6, b_glass6, 'receive', 10, v_user, 'Coast Glass Distributors'),
    (p_tough10, b_tough, 'receive', 4, v_user, 'Coast Glass Distributors'),
    (p_alu, b_alu, 'receive', 20, v_user, 'Alutech Kenya Ltd'),
    (p_upvc, b_upvc, 'receive', 15, v_user, 'Alutech Kenya Ltd'),
    (p_silicone, b_sil, 'receive', 48, v_user, 'Mombasa Hardware Wholesalers'),
    (p_screws, b_scr, 'receive', 25, v_user, 'Mombasa Hardware Wholesalers');

  -- ---------- Stock units ----------
  -- Glass 6mm: 10 sheets 2440x1220 (3 tracked individually for the story below)
  insert into public.stock_units (product_id, batch_id, length_mm, width_mm, thickness_mm) values
    (p_glass6, b_glass6, 2440, 1220, 6) returning id into u_g1;
  insert into public.stock_units (product_id, batch_id, length_mm, width_mm, thickness_mm) values
    (p_glass6, b_glass6, 2440, 1220, 6) returning id into u_g2;
  insert into public.stock_units (product_id, batch_id, length_mm, width_mm, thickness_mm) values
    (p_glass6, b_glass6, 2440, 1220, 6) returning id into u_g3;
  for i in 1..7 loop
    insert into public.stock_units (product_id, batch_id, length_mm, width_mm, thickness_mm)
    values (p_glass6, b_glass6, 2440, 1220, 6);
  end loop;
  -- Toughened: 4 jumbo sheets
  for i in 1..4 loop
    insert into public.stock_units (product_id, batch_id, length_mm, width_mm, thickness_mm)
    values (p_tough10, b_tough, 3210, 2250, 10);
  end loop;
  -- Aluminium: 20 bars 6000mm (one tracked)
  insert into public.stock_units (product_id, batch_id, length_mm) values (p_alu, b_alu, 6000) returning id into u_a1;
  for i in 1..19 loop
    insert into public.stock_units (product_id, batch_id, length_mm) values (p_alu, b_alu, 6000);
  end loop;
  -- UPVC: 15 bars 5800mm
  for i in 1..15 loop
    insert into public.stock_units (product_id, batch_id, length_mm) values (p_upvc, b_upvc, 5800);
  end loop;

  -- ---------- Quotations ----------
  -- Q1: accepted -> delivered order -> issued invoice, partially paid via M-Pesa
  insert into public.quotations (client_id, status, valid_until, notes, created_by)
    values (c_nyali, 'accepted', current_date + 14, 'Beachfront villa: sliding windows, phase 1 of 2.', v_user)
    returning id into q1;
  insert into public.quotation_line_items (quotation_id, product_id, description, qty, unit_price) values
    (q1, p_alu, 'Aluminium sliding windows 1500×1200, supply & fit', 4, 28500),
    (q1, p_glass6, '6mm clear float glass panels 1200×800', 6, 4200),
    (q1, null, 'Site installation & sealing (Nyali)', 1, 15000);

  -- Q2: accepted -> open order with a reserved sheet
  insert into public.quotations (client_id, status, valid_until, notes, created_by)
    values (c_kilifi, 'accepted', current_date + 21, 'Block C balcony glazing.', v_user)
    returning id into q2;
  insert into public.quotation_line_items (quotation_id, product_id, description, qty, unit_price) values
    (q2, p_tough10, '10mm toughened glass balustrade panels 1100×900', 8, 9800),
    (q2, null, 'SS handrail brackets & fixing', 8, 1200);

  -- Q3: sent, awaiting client
  insert into public.quotations (client_id, status, valid_until, notes, created_by)
    values (c_taita, 'sent', current_date + 30, 'Lodge reception partition.', v_user)
    returning id into q3;
  insert into public.quotation_line_items (quotation_id, product_id, description, qty, unit_price) values
    (q3, p_alu, 'Office partition frame, aluminium 100×50', 12, 3400),
    (q3, p_glass6, '6mm glass infill panels', 10, 3900);

  -- Q4: draft in progress
  insert into public.quotations (client_id, status, notes, created_by)
    values (c_nyali, 'draft', 'Phase 2: wardrobe shutters (MDF/aluminium).', v_user)
    returning id into q4;
  insert into public.quotation_line_items (quotation_id, description, qty, unit_price) values
    (q4, 'MDF/aluminium wardrobe shutters, master bedroom', 6, 11500);

  -- ---------- Sales orders ----------
  insert into public.sales_orders (quotation_id, client_id, status, created_by)
    values (q1, c_nyali, 'delivered', v_user) returning id into so1;
  insert into public.sales_orders (quotation_id, client_id, status, created_by)
    values (q2, c_kilifi, 'open', v_user) returning id into so2;

  -- ---------- Cut / consume / reserve story ----------
  -- Sheet 1 cut for SO1: two usable offcuts survive
  update public.stock_units set status = 'consumed' where id = u_g1;
  insert into public.stock_units (product_id, batch_id, length_mm, width_mm, thickness_mm, status, parent_unit_id) values
    (p_glass6, b_glass6, 1200, 800, 6, 'offcut', u_g1),
    (p_glass6, b_glass6, 900, 400, 6, 'offcut', u_g1);
  insert into public.stock_movements (product_id, stock_unit_id, batch_id, movement_type, sales_order_id, performed_by, notes)
    values (p_glass6, u_g1, b_glass6, 'cut', so1, v_user, 'Panels for Nyali sliding windows');

  -- Sheet 2 issued whole to SO1
  update public.stock_units set status = 'consumed' where id = u_g2;
  insert into public.stock_movements (product_id, stock_unit_id, batch_id, movement_type, sales_order_id, performed_by)
    values (p_glass6, u_g2, b_glass6, 'issue', so1, v_user);

  -- One aluminium bar cut for SO1, 2400mm offcut survives
  update public.stock_units set status = 'consumed' where id = u_a1;
  insert into public.stock_units (product_id, batch_id, length_mm, status, parent_unit_id)
    values (p_alu, b_alu, 2400, 'offcut', u_a1);
  insert into public.stock_movements (product_id, stock_unit_id, batch_id, movement_type, sales_order_id, performed_by, notes)
    values (p_alu, u_a1, b_alu, 'cut', so1, v_user, 'Window frames, Nyali');

  -- Consumables issued to SO1 (silicone 8 pcs, screws 3 boxes - already reflected in qty_remaining)
  insert into public.stock_movements (product_id, batch_id, movement_type, quantity, sales_order_id, performed_by) values
    (p_silicone, b_sil, 'issue', 8, so1, v_user),
    (p_screws, b_scr, 'issue', 3, so1, v_user);

  -- Sheet 3 reserved for SO2 (Kilifi)
  update public.stock_units set status = 'reserved' where id = u_g3;
  insert into public.sales_order_reservations (sales_order_id, stock_unit_id, created_by) values (so2, u_g3, v_user);
  insert into public.stock_movements (product_id, stock_unit_id, batch_id, movement_type, sales_order_id, performed_by)
    values (p_glass6, u_g3, b_glass6, 'reserve', so2, v_user);

  -- ---------- Invoices ----------
  -- INV1 from SO1: issue fires the AR/Sales/VAT journal + eTIMS queue
  insert into public.sales_invoices (sales_order_id, client_id, status, due_date, created_by)
    values (so1, c_nyali, 'draft', current_date + 30, v_user) returning id into inv1;
  insert into public.invoice_line_items (invoice_id, product_id, description, qty, unit_price)
    select inv1, product_id, description, qty, unit_price from public.quotation_line_items where quotation_id = q1;
  update public.sales_invoices set status = 'issued', issued_at = now() - interval '6 days' where id = inv1;

  -- INV2: standalone, 45 days overdue (feeds the aging chart)
  insert into public.sales_invoices (client_id, status, due_date, created_by)
    values (c_taita, 'draft', current_date - 45, v_user) returning id into inv2;
  insert into public.invoice_line_items (invoice_id, description, qty, unit_price) values
    (inv2, 'Stainless steel handrail 12m, supply & install', 1, 96000);
  update public.sales_invoices set status = 'issued', issued_at = now() - interval '50 days' where id = inv2;

  -- M-Pesa part-payment on INV1: triggers set partially_paid + Cash/AR journal
  insert into public.payments (invoice_id, method, amount, phone, mpesa_checkout_request_id, mpesa_receipt_number, status)
    values (inv1, 'mpesa', 100000, '254722315890', 'ws_CO_demo_0001', 'SFH8XK2Q1P', 'completed');

  -- ---------- Expenses ----------
  insert into public.expenses (department_id, account_code, description, amount, expense_date, created_by) values
    (d_workshop, '6200', 'Transport: crew + materials to Kilifi site', 8500, current_date - 5, v_user),
    (d_workshop, '6000', 'Workshop electricity (monthly)', 12400, current_date - 3, v_user),
    (d_admin, '6100', 'Casual labour wages, week 28', 18000, current_date - 2, v_user);

  -- ---------- Attendance ----------
  insert into public.kiosk_devices (name) values ('Workshop Entrance Tablet') returning id into kiosk_id;
  insert into public.employee_badges (profile_id) values (v_user) returning id into badge_id;
  insert into public.attendance (employee_id, scanned_at, direction, kiosk_device_id) values
    (v_user, date_trunc('day', now() - interval '1 day') + interval '7 hours 58 minutes', 'in', kiosk_id),
    (v_user, date_trunc('day', now() - interval '1 day') + interval '17 hours 3 minutes', 'out', kiosk_id),
    (v_user, date_trunc('day', now()) + interval '8 hours 2 minutes', 'in', kiosk_id);

  -- ---------- Purchase orders (one per approval state) ----------
  insert into public.purchase_orders (supplier_id, status, notes, created_by)
    values (s_coast, 'pending_approval', 'Restock 6mm float glass ahead of Kilifi job', v_user) returning id into po1;
  insert into public.purchase_order_items (purchase_order_id, product_id, description, qty, unit_cost, length_mm, width_mm, thickness_mm)
    values (po1, p_glass6, '6mm clear float 2440×1220', 20, 3150, 2440, 1220, 6);

  insert into public.purchase_orders (supplier_id, status, notes, created_by)
    values (s_hardware, 'draft', 'Consumables top-up', v_user) returning id into po2;
  insert into public.purchase_order_items (purchase_order_id, product_id, description, qty, unit_cost) values
    (po2, p_silicone, 'Silicone sealant clear 280ml', 24, 340),
    (po2, p_screws, 'SS screws 25mm (box 500)', 10, 540);

  insert into public.purchase_orders (supplier_id, status, notes, created_by, approved_by, approved_at)
    values (s_alutech, 'approved', 'UPVC profile for Taita quote (if accepted)', v_user, v_user, now() - interval '1 day')
    returning id into po3;
  insert into public.purchase_order_items (purchase_order_id, product_id, description, qty, unit_cost, length_mm)
    values (po3, p_upvc, 'UPVC window profile 60mm, 5.8m lengths', 10, 1080, 5800);

  raise notice 'Demo data seeded. Anchor user: %', v_user;
end $$;
