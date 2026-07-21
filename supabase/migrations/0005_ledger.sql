-- =============================================================
-- Phase 5: Double-entry financial ledger
-- =============================================================

create type public.account_type as enum ('asset','liability','equity','income','expense');

create table public.chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  type public.account_type not null,
  created_at timestamptz not null default now()
);

insert into public.chart_of_accounts (code, name, type) values
  ('1000', 'Cash on Hand', 'asset'),
  ('1010', 'M-Pesa', 'asset'),
  ('1020', 'Bank', 'asset'),
  ('1100', 'Accounts Receivable', 'asset'),
  ('1200', 'Inventory', 'asset'),
  ('2000', 'Accounts Payable', 'liability'),
  ('2100', 'VAT Payable', 'liability'),
  ('3000', 'Owner Equity', 'equity'),
  ('4000', 'Sales Revenue', 'income'),
  ('5000', 'Cost of Goods Sold', 'expense'),
  ('6000', 'Operating Expenses', 'expense'),
  ('6100', 'Salaries & Wages', 'expense'),
  ('6200', 'Transport & Site Costs', 'expense');

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  memo text not null,
  source_type text,   -- invoice | payment | purchase | expense | delivery | manual
  source_id uuid,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.journal_entries (id) on delete cascade,
  account_id uuid not null references public.chart_of_accounts (id),
  debit numeric(14,2) not null default 0 check (debit >= 0),
  credit numeric(14,2) not null default 0 check (credit >= 0),
  check (debit = 0 or credit = 0)
);
create index journal_lines_entry_idx on public.journal_lines (entry_id);
create index journal_lines_account_idx on public.journal_lines (account_id);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  department_id uuid references public.departments (id),
  account_code text not null default '6000' references public.chart_of_accounts (code),
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  expense_date date not null default current_date,
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.stock_batches (id),
  supplier_name text,
  amount numeric(12,2) not null check (amount > 0),
  purchase_date date not null default current_date,
  notes text,
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);

-- ---------- RLS ----------
alter table public.chart_of_accounts enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines enable row level security;
alter table public.expenses enable row level security;
alter table public.purchases enable row level security;

create policy coa_select on public.chart_of_accounts for select to authenticated
  using (public.is_one_of(array['finance','admin','super_admin']::public.app_role[]));
create policy journal_entries_select on public.journal_entries for select to authenticated
  using (public.is_one_of(array['finance','admin','super_admin']::public.app_role[]));
create policy journal_lines_select on public.journal_lines for select to authenticated
  using (public.is_one_of(array['finance','admin','super_admin']::public.app_role[]));
create policy expenses_all on public.expenses for all to authenticated
  using (public.is_one_of(array['finance','admin','super_admin']::public.app_role[]))
  with check (public.is_one_of(array['finance','admin','super_admin']::public.app_role[]));
create policy purchases_select on public.purchases for select to authenticated
  using (public.is_one_of(array['finance','admin','super_admin']::public.app_role[]));
create policy purchases_insert on public.purchases for insert to authenticated
  with check (public.is_one_of(array['finance','admin','super_admin']::public.app_role[]));
-- Journal writes happen only via post_journal (SECURITY DEFINER).

-- ---------- Posting engine ----------
create or replace function public.post_journal(
  p_memo text, p_source_type text, p_source_id uuid, p_lines jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_entry_id uuid;
  v_line jsonb;
  v_account_id uuid;
  v_debits numeric := 0;
  v_credits numeric := 0;
begin
  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_debits := v_debits + coalesce((v_line ->> 'debit')::numeric, 0);
    v_credits := v_credits + coalesce((v_line ->> 'credit')::numeric, 0);
  end loop;
  if round(v_debits, 2) <> round(v_credits, 2) then
    raise exception 'Unbalanced journal entry: debits % <> credits %', v_debits, v_credits;
  end if;
  if v_debits = 0 then return null; end if;

  insert into journal_entries (memo, source_type, source_id, created_by)
  values (p_memo, p_source_type, p_source_id, auth.uid())
  returning id into v_entry_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    select id into v_account_id from chart_of_accounts where code = v_line ->> 'code';
    if v_account_id is null then raise exception 'Unknown account code %', v_line ->> 'code'; end if;
    insert into journal_lines (entry_id, account_id, debit, credit)
    values (v_entry_id, v_account_id,
            coalesce((v_line ->> 'debit')::numeric, 0),
            coalesce((v_line ->> 'credit')::numeric, 0));
  end loop;
  return v_entry_id;
end; $$;

-- Invoice issued: AR dr / Sales cr + VAT cr
create or replace function public.post_invoice_journal()
returns trigger language plpgsql security definer set search_path = public as $$
declare v record;
begin
  if new.status = 'issued' and old.status = 'draft' then
    select subtotal, vat_amount, total into v from public.v_invoice_totals where invoice_id = new.id;
    perform public.post_journal(
      'Invoice ' || new.invoice_number, 'invoice', new.id,
      jsonb_build_array(
        jsonb_build_object('code', '1100', 'debit', v.total),
        jsonb_build_object('code', '4000', 'credit', v.subtotal),
        jsonb_build_object('code', '2100', 'credit', v.vat_amount)
      ));
  end if;
  return new;
end; $$;
create trigger sales_invoices_post_journal after update on public.sales_invoices
  for each row execute function public.post_invoice_journal();

-- Payment completed: Cash/M-Pesa/Bank dr / AR cr
create or replace function public.post_payment_journal()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    v_code := case new.method when 'mpesa' then '1010' when 'bank' then '1020' else '1000' end;
    perform public.post_journal(
      'Payment on invoice', 'payment', new.id,
      jsonb_build_array(
        jsonb_build_object('code', v_code, 'debit', new.amount),
        jsonb_build_object('code', '1100', 'credit', new.amount)
      ));
  end if;
  return new;
end; $$;
create trigger payments_post_journal after insert or update on public.payments
  for each row execute function public.post_payment_journal();

-- Purchase recorded: Inventory dr / Accounts Payable cr
create or replace function public.post_purchase_journal()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.post_journal(
    'Purchase ' || coalesce(new.supplier_name, ''), 'purchase', new.id,
    jsonb_build_array(
      jsonb_build_object('code', '1200', 'debit', new.amount),
      jsonb_build_object('code', '2000', 'credit', new.amount)
    ));
  return new;
end; $$;
create trigger purchases_post_journal after insert on public.purchases
  for each row execute function public.post_purchase_journal();

-- Expense recorded: Expense account dr / Cash cr
create or replace function public.post_expense_journal()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.post_journal(
    'Expense: ' || new.description, 'expense', new.id,
    jsonb_build_array(
      jsonb_build_object('code', new.account_code, 'debit', new.amount),
      jsonb_build_object('code', '1000', 'credit', new.amount)
    ));
  return new;
end; $$;
create trigger expenses_post_journal after insert on public.expenses
  for each row execute function public.post_expense_journal();

-- Delivery: COGS dr / Inventory cr at batch cost of consumed root units.
-- Simplification (documented): full batch unit_cost is charged when a ROOT
-- unit is consumed; consuming an offcut carries zero incremental cost since
-- the original piece was already expensed to the job that cut it.
create or replace function public.deliver_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_res record; v_cogs numeric(14,2) := 0;
begin
  if not public.is_one_of(array['sales','workshop','admin','super_admin']::public.app_role[]) then
    raise exception 'Not authorised';
  end if;
  perform 1 from sales_orders where id = p_order_id and status in ('open','in_progress') for update;
  if not found then raise exception 'Order not found or not open'; end if;
  for v_res in
    select r.stock_unit_id, su.product_id, su.batch_id, su.parent_unit_id, sb.unit_cost
    from sales_order_reservations r
    join stock_units su on su.id = r.stock_unit_id
    join stock_batches sb on sb.id = su.batch_id
    where r.sales_order_id = p_order_id
  loop
    update stock_units set status = 'consumed' where id = v_res.stock_unit_id;
    insert into stock_movements (product_id, stock_unit_id, batch_id, movement_type, sales_order_id, performed_by)
    values (v_res.product_id, v_res.stock_unit_id, v_res.batch_id, 'issue', p_order_id, auth.uid());
    if v_res.parent_unit_id is null then
      v_cogs := v_cogs + v_res.unit_cost;
    end if;
  end loop;
  update sales_orders set status = 'delivered' where id = p_order_id;
  if v_cogs > 0 then
    perform public.post_journal(
      'COGS for order', 'delivery', p_order_id,
      jsonb_build_array(
        jsonb_build_object('code', '5000', 'debit', v_cogs),
        jsonb_build_object('code', '1200', 'credit', v_cogs)
      ));
  end if;
end; $$;

-- ---------- Reporting views (security_invoker: finance-only via base RLS) ----------
create view public.v_account_balances with (security_invoker = true) as
  select a.id, a.code, a.name, a.type,
    coalesce(sum(l.debit), 0) - coalesce(sum(l.credit), 0) as balance
  from public.chart_of_accounts a
  left join public.journal_lines l on l.account_id = a.id
  group by a.id, a.code, a.name, a.type
  order by a.code;

create view public.v_receivables with (security_invoker = true) as
  select i.id, i.invoice_number, c.name as client_name, i.status, i.due_date,
    t.total, i.amount_paid, (t.total - i.amount_paid) as balance
  from public.sales_invoices i
  join public.clients c on c.id = i.client_id
  join public.v_invoice_totals t on t.invoice_id = i.id
  where i.status in ('issued', 'partially_paid');

create view public.v_job_profitability with (security_invoker = true) as
  select so.id, so.order_number, c.name as client_name, so.status,
    coalesce((select sum(t.total)
      from public.v_invoice_totals t
      join public.sales_invoices i on i.id = t.invoice_id
      where i.sales_order_id = so.id and i.status <> 'void'), 0) as revenue,
    coalesce((select sum(
        case
          when sm.quantity is not null then sm.quantity * sb.unit_cost
          when su.parent_unit_id is null then sb.unit_cost
          else 0
        end)
      from public.stock_movements sm
      join public.stock_batches sb on sb.id = sm.batch_id
      left join public.stock_units su on su.id = sm.stock_unit_id
      where sm.sales_order_id = so.id and sm.movement_type in ('issue', 'cut')), 0) as material_cost,
    0::numeric(14,2) as labor_cost
  from public.sales_orders so
  join public.clients c on c.id = so.client_id;

grant select on public.v_account_balances, public.v_receivables, public.v_job_profitability to authenticated;
