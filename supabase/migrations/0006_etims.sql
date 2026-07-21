-- =============================================================
-- Phase 6: KRA eTIMS (OSCU) submission queue
-- Compliance requirement: failed submissions MUST retry.
-- =============================================================

alter table public.sales_invoices
  add column fiscal_document_number text,
  add column etims_qr_url text;

create type public.etims_status as enum ('queued','processing','success','failed','abandoned');

create table public.etims_submissions (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null unique references public.sales_invoices (id),
  status public.etims_status not null default 'queued',
  attempts integer not null default 0,
  last_error text,
  next_retry_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index etims_due_idx on public.etims_submissions (status, next_retry_at);

create trigger etims_submissions_set_updated_at before update on public.etims_submissions
  for each row execute function public.set_updated_at();

alter table public.etims_submissions enable row level security;
create policy etims_select on public.etims_submissions for select to authenticated
  using (public.is_one_of(array['finance','admin','super_admin']::public.app_role[]));
-- Writes happen via the enqueue trigger and the service-role cron processor.

-- Enqueue automatically when an invoice is issued.
create or replace function public.enqueue_etims_submission()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'issued' and old.status = 'draft' then
    insert into public.etims_submissions (invoice_id)
    values (new.id)
    on conflict (invoice_id) do nothing;
  end if;
  return new;
end; $$;

create trigger sales_invoices_enqueue_etims after update on public.sales_invoices
  for each row execute function public.enqueue_etims_submission();
