create or replace function private.vtg_public_verified_supplier(p_supplier_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.profiles p
    join public.supplier_profiles sp on sp.user_id = p.id
    where p.id = p_supplier_id
      and p.role = 'supplier'::public.vtg_account_role
      and p.account_environment = 'trade'
      and p.is_active = true
      and sp.verification_status = 'verified'::public.vtg_document_status
      and (sp.verification_expires_at is null or sp.verification_expires_at > now())
  );
$function$;

revoke all on function private.vtg_public_verified_supplier(uuid) from public, anon, authenticated;
grant execute on function private.vtg_public_verified_supplier(uuid) to anon, authenticated;

drop policy if exists "active verified trade supplier products public read" on public.products;
create policy "active verified trade supplier products public read"
on public.products
for select
to anon
using (
  is_active = true
  and private.vtg_public_verified_supplier(supplier_id)
);

drop policy if exists "supplier profiles visible to owner admin or public when verified" on public.supplier_profiles;
create policy "public verified supplier profiles read"
on public.supplier_profiles
for select
to anon
using (
  verification_status = 'verified'::public.vtg_document_status
  and (verification_expires_at is null or verification_expires_at > now())
);
create policy "authenticated supplier profiles owner admin or verified"
on public.supplier_profiles
for select
to authenticated
using (
  (
    verification_status = 'verified'::public.vtg_document_status
    and (verification_expires_at is null or verification_expires_at > now())
  )
  or user_id = (select auth.uid())
  or private.vtg_is_admin()
);
