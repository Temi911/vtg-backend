-- Public-read bucket for supplier product photos shown in the buyer marketplace.
-- Suppliers can only write inside their own folder (<auth.uid()>/...).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vtg-product-images', 'vtg-product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Suppliers upload own product images" on storage.objects;
create policy "Suppliers upload own product images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'vtg-product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role::text = 'supplier'
        and p.is_active = true
        and p.account_environment = 'trade'
    )
  );

drop policy if exists "Suppliers delete own product images" on storage.objects;
create policy "Suppliers delete own product images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'vtg-product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
