-- Business document and logo uploads are available only after account-opening approval.
-- The applicant must first be promoted to the matching trade role by VTG administration.

begin;

drop policy if exists "Active trade users submit own verification documents"
  on public.vtg_verification_documents;

create policy "Approved business accounts submit own verification documents"
  on public.vtg_verification_documents
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and account_role in ('supplier','bank','agent')
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role::text = account_role
        and p.is_active = true
        and p.account_environment = 'trade'
    )
  );

drop policy if exists "Verification owner upload objects" on storage.objects;

create policy "Approved business accounts upload verification objects"
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vtg-verification-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role::text in ('supplier','bank','agent')
        and p.is_active = true
        and p.account_environment = 'trade'
    )
  );

drop policy if exists "Applicants upload own company logos" on storage.objects;

create policy "Approved business accounts upload own company logos"
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vtg-company-logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role::text in ('supplier','bank','agent')
        and p.is_active = true
        and p.account_environment = 'trade'
    )
  );

commit;
