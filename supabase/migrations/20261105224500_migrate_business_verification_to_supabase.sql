-- VTG business verification: Supabase Storage + RLS + admin review workflow.
-- Documents are private; company logos are public only after being placed in the public logo bucket.

drop policy if exists "Applicants insert own verification documents" on public.vtg_verification_documents;
drop policy if exists "Active trade users submit own verification documents" on public.vtg_verification_documents;
create policy "Active trade users submit own verification documents"
on public.vtg_verification_documents for insert to authenticated
with check (
  user_id = (select auth.uid())
  and account_role in ('supplier','bank','agent')
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active = true
      and p.account_environment = 'trade'
  )
);

drop policy if exists "Admins update verification documents" on public.vtg_verification_documents;
create policy "Admins update verification documents"
on public.vtg_verification_documents for update to authenticated
using (private.vtg_is_admin())
with check (private.vtg_is_admin());

drop policy if exists "Applicants upload own company logos" on storage.objects;
create policy "Applicants upload own company logos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'vtg-company-logos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create or replace function public.vtg_admin_review_verification_document(
  p_document_id uuid,
  p_status text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_doc public.vtg_verification_documents%rowtype;
  v_required text[];
  v_all_verified boolean := false;
  v_user_meta jsonb;
  v_logo_path text;
begin
  if not private.vtg_is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_status not in ('verified','rejected') then
    raise exception 'Review status must be verified or rejected';
  end if;
  if p_status = 'rejected' and coalesce(length(trim(p_notes)),0) = 0 then
    raise exception 'A correction note is required when rejecting a document';
  end if;

  select * into v_doc
  from public.vtg_verification_documents
  where id = p_document_id
  for update;
  if not found then raise exception 'Verification document not found'; end if;

  update public.vtg_verification_documents
  set status = p_status,
      review_notes = nullif(trim(p_notes),''),
      reviewer_id = auth.uid(),
      reviewed_at = now()
  where id = p_document_id;

  if v_doc.account_role = 'supplier' then
    v_required := array['company_registration','business_license','tax_certificate','company_address_proof','company_logo'];
  elsif v_doc.account_role = 'bank' then
    v_required := array['bank_license','regulatory_certificate','company_registration','swift_bic_certificate','institution_address_proof','officer_authorization','company_logo'];
  else
    v_required := array['government_id','proof_of_address','business_registration','professional_certificate','reference_document','company_logo'];
  end if;

  select not exists (
    select 1 from unnest(v_required) required_type
    where not exists (
      select 1 from public.vtg_verification_documents d
      where d.user_id = v_doc.user_id
        and d.account_role = v_doc.account_role
        and d.doc_type = required_type
        and d.status = 'verified'
    )
  ) into v_all_verified;

  if v_all_verified then
    update public.profiles
    set role = v_doc.account_role::public.vtg_account_role, updated_at = now()
    where id = v_doc.user_id;

    select raw_user_meta_data into v_user_meta
    from auth.users where id = v_doc.user_id;
    select storage_path into v_logo_path
    from public.vtg_verification_documents
    where user_id = v_doc.user_id and account_role = v_doc.account_role
      and doc_type = 'company_logo' and status = 'verified'
    order by uploaded_at desc limit 1;

    if v_doc.account_role = 'supplier' then
      insert into public.supplier_profiles
        (user_id,company_name,registration_no,country,city,verification_status,logo_url,verified_at)
      values
        (v_doc.user_id,
         coalesce(v_user_meta->>'company_name',v_user_meta->>'organization_name','Supplier company'),
         coalesce(v_user_meta->>'registration_no',v_user_meta->>'registration_reference'),
         v_user_meta->>'country',v_user_meta->>'city','verified',
         'https://lxrurbdzphqvkjprlfuv.supabase.co/storage/v1/object/public/vtg-company-logos/' || v_logo_path,
         now())
      on conflict(user_id) do update
        set verification_status='verified',verified_at=now(),logo_url=excluded.logo_url;
    elsif v_doc.account_role = 'bank' then
      insert into public.bank_profiles
        (user_id,bank_name,swift_code,branch_name,officer_name,officer_title,verification_status,logo_url,verified_at)
      values
        (v_doc.user_id,
         coalesce(v_user_meta->>'bank_name',v_user_meta->>'organization_name','Financial institution'),
         v_user_meta->>'swift_code',v_user_meta->>'branch',
         v_user_meta->>'full_name',v_user_meta->>'officer_title','verified',
         'https://lxrurbdzphqvkjprlfuv.supabase.co/storage/v1/object/public/vtg-company-logos/' || v_logo_path,
         now())
      on conflict(user_id) do update
        set verification_status='verified',verified_at=now(),logo_url=excluded.logo_url;
    else
      insert into public.agent_profiles
        (user_id,agency_name,agent_type,license_number,country,city,verification_status,logo_url,verified_at)
      values
        (v_doc.user_id,
         coalesce(v_user_meta->>'agency_name',v_user_meta->>'company_name',v_user_meta->>'organization_name','Trade services agency'),
         coalesce(v_user_meta->>'agent_type','trade_agent'),
         v_user_meta->>'license_number',v_user_meta->>'country',v_user_meta->>'city','verified',
         'https://lxrurbdzphqvkjprlfuv.supabase.co/storage/v1/object/public/vtg-company-logos/' || v_logo_path,
         now())
      on conflict(user_id) do update
        set verification_status='verified',verified_at=now(),logo_url=excluded.logo_url;
    end if;
  elsif p_status = 'rejected' then
    if v_doc.account_role = 'supplier' then
      update public.supplier_profiles set verification_status='pending' where user_id=v_doc.user_id;
    elsif v_doc.account_role = 'bank' then
      update public.bank_profiles set verification_status='pending' where user_id=v_doc.user_id;
    elsif v_doc.account_role = 'agent' then
      update public.agent_profiles set verification_status='pending' where user_id=v_doc.user_id;
    end if;
  end if;

  return jsonb_build_object(
    'success',true,
    'verificationStatus',case when v_all_verified then 'verified' when p_status='rejected' then 'needs_correction' else 'under_review' end,
    'allRequiredDocumentsVerified',v_all_verified
  );
end;
$$;

revoke all on function public.vtg_admin_review_verification_document(uuid,text,text) from public,anon;
grant execute on function public.vtg_admin_review_verification_document(uuid,text,text) to authenticated;
