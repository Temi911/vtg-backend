-- Restrict the supplier catalogue to active trade-environment supplier accounts.
-- Buyer-facing reads additionally require an active, VTG-verified supplier profile.

drop policy if exists "active suppliers create own products" on public.products;
create policy "active trade suppliers create own products"
on public.products for insert to authenticated
with check (
  supplier_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'supplier'::public.vtg_account_role
      and p.account_environment = 'trade'
      and p.is_active = true
  )
);

drop policy if exists "active suppliers update own products" on public.products;
create policy "active trade suppliers update own products"
on public.products for update to authenticated
using (
  (
    supplier_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'supplier'::public.vtg_account_role
        and p.account_environment = 'trade'
        and p.is_active = true
    )
  ) or private.vtg_is_admin()
)
with check (
  (
    supplier_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'supplier'::public.vtg_account_role
        and p.account_environment = 'trade'
        and p.is_active = true
    )
  ) or private.vtg_is_admin()
);

drop policy if exists "active suppliers delete own products" on public.products;
create policy "active trade suppliers delete own products"
on public.products for delete to authenticated
using (
  (
    supplier_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'supplier'::public.vtg_account_role
        and p.account_environment = 'trade'
        and p.is_active = true
    )
  ) or private.vtg_is_admin()
);

drop policy if exists "active verified supplier products public read" on public.products;
create policy "active verified trade supplier products public read"
on public.products for select to anon
using (
  is_active = true
  and exists (
    select 1
    from public.profiles p
    join public.supplier_profiles sp on sp.user_id = p.id
    where p.id = products.supplier_id
      and p.role = 'supplier'::public.vtg_account_role
      and p.account_environment = 'trade'
      and p.is_active = true
      and sp.verification_status = 'verified'::public.vtg_document_status
  )
);

drop policy if exists "active verified supplier products authenticated read" on public.products;
create policy "active verified trade supplier products authenticated read"
on public.products for select to authenticated
using (
  (
    supplier_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'supplier'::public.vtg_account_role
        and p.account_environment = 'trade'
        and p.is_active = true
    )
  )
  or private.vtg_is_admin()
  or (
    is_active = true
    and exists (
      select 1
      from public.profiles p
      join public.supplier_profiles sp on sp.user_id = p.id
      where p.id = products.supplier_id
        and p.role = 'supplier'::public.vtg_account_role
        and p.account_environment = 'trade'
        and p.is_active = true
        and sp.verification_status = 'verified'::public.vtg_document_status
    )
  )
);

drop policy if exists "Suppliers delete own product images" on storage.objects;
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