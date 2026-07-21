-- =============================================================
-- Phase 4: Payments (M-Pesa Daraja + manual cash/bank)
-- =============================================================

alter table public.sales_invoices
  add column payment_token uuid not null default gen_random_uuid();
create unique index sales_invoices_payment_token_idx on public.sales_invoices (payment_token);

create type public.payment_method as enum ('mpesa','cash','bank');
create type public.payment_status as enum ('pending','completed','failed');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.sales_invoices (id),
  method public.payment_method not null,
  amount numeric(12,2) not null check (amount > 0),
  phone text,
  mpesa_checkout_request_id text unique,
  mpesa_receipt_number text,
  status public.payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index payments_invoice_idx on public.payments (invoice_id);

alter table public.payments enable row level security;

create policy payments_select on public.payments for select to authenticated
  using (public.is_one_of(array['finance','sales','admin','super_admin']::public.app_role[]));
-- Manual cash/bank payments recorded by finance; M-Pesa rows are written by
-- the service role (bypasses RLS) from the Daraja webhook handler.
create policy payments_insert_finance on public.payments for insert to authenticated
  with check (public.is_one_of(array['finance','admin','super_admin']::public.app_role[]));
create policy payments_update_finance on public.payments for update to authenticated
  using (public.is_one_of(array['finance','admin','super_admin']::public.app_role[]))
  with check (public.is_one_of(array['finance','admin','super_admin']::public.app_role[]));

-- Apply a completed payment to its invoice.
create or replace function public.apply_payment()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_total numeric(12,2); v_paid numeric(12,2);
begin
  if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    select total into v_total from public.v_invoice_totals where invoice_id = new.invoice_id;
    update public.sales_invoices
      set amount_paid = amount_paid + new.amount
      where id = new.invoice_id
      returning amount_paid into v_paid;
    update public.sales_invoices
      set status = case when v_paid >= coalesce(v_total, 0) then 'paid' else 'partially_paid' end::public.invoice_status
      where id = new.invoice_id and status in ('issued','partially_paid');
    new.completed_at = coalesce(new.completed_at, now());
  end if;
  return new;
end; $$;

create trigger payments_apply before insert or update on public.payments
  for each row execute function public.apply_payment();
