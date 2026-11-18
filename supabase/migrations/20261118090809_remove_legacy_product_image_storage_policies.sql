-- Remove legacy permissive policies so the stricter supplier-only rules are effective.
drop policy if exists "Active trade suppliers upload own product images" on storage.objects;
drop policy if exists "Active trade suppliers update own product images" on storage.objects;
drop policy if exists "Active trade suppliers delete own product images" on storage.objects;
drop policy if exists "Suppliers delete own product images" on storage.objects;
drop policy if exists "suppliers delete own product images" on storage.objects;
drop policy if exists "suppliers manage own product images" on storage.objects;
drop policy if exists "approved suppliers upload product images" on storage.objects;

create policy "Active trade suppliers upload own product images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'vtg-product-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'supplier'::public.vtg_account_role
      and p.account_environment = 'trade'
      and p.is_active = true
  )
);

create policy "Active trade suppliers update own product images"
on storage.objects for update to authenticated
using (
  bucket_id = 'vtg-product-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'supplier'::public.vtg_account_role
      and p.account_environment = 'trade'
      and p.is_active = true
  )
)
with check (
  bucket_id = 'vtg-product-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'supplier'::public.vtg_account_role
      and p.account_environment = 'trade'
      and p.is_active = true
  )
);

create policy "Active trade suppliers delete own product images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'vtg-product-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'supplier'::public.vtg_account_role
      and p.account_environment = 'trade'
      and p.is_active = true
  )
);