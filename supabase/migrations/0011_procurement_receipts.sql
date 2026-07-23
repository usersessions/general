-- =============================================================
-- Phase 11: Procurement Receipts Uploads
-- =============================================================

alter table public.purchase_orders add column if not exists receipt_url text;

-- Setup Storage Bucket
insert into storage.buckets (id, name, public) 
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

-- Storage RLS Policies
-- Allow any authenticated user to select (view) receipts
create policy receipts_select on storage.objects for select to authenticated
using (bucket_id = 'receipts');

-- Allow procurement, finance, admin, super_admin to insert (upload) receipts
create policy receipts_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'receipts' and 
  public.is_one_of(array['procurement', 'finance', 'admin', 'super_admin']::public.app_role[])
);

-- Allow procurement, finance, admin, super_admin to update/replace receipts
create policy receipts_update on storage.objects for update to authenticated
using (bucket_id = 'receipts')
with check (
  bucket_id = 'receipts' and 
  public.is_one_of(array['procurement', 'finance', 'admin', 'super_admin']::public.app_role[])
);
