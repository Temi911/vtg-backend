-- Private bucket for supplier trade-document files (invoices, packing lists, certificates...).
-- Each supplier can only read, write and delete inside their own <auth.uid()>/ folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vtg-supplier-documents', 'vtg-supplier-documents', false, 10485760,
        array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = 10485760,
      allowed_mime_types = array['application/pdf','image/jpeg','image/png','image/webp'];

drop policy if exists "Suppliers read own documents" on storage.objects;
create policy "Suppliers read own documents"
  on storage.objects for select to authenticated
  using (bucket_id = 'vtg-supplier-documents'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Suppliers upload own documents" on storage.objects;
create policy "Suppliers upload own documents"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'vtg-supplier-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role::text = 'supplier'
        and p.is_active = true
        and p.account_environment = 'trade'
    )
  );

drop policy if exists "Suppliers delete own documents" on storage.objects;
create policy "Suppliers delete own documents"
  on storage.objects for delete to authenticated
  using (bucket_id = 'vtg-supplier-documents'
         and (storage.foldername(name))[1] = (select auth.uid())::text);
