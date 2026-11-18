-- A supplier/bank application cannot be approved or rejected until the applicant has verified their email.
-- Email confirmation is checked inside the privileged database function as the final authority.
create or replace function public.vtg_admin_review_role_request(
  p_request_id uuid, p_decision text, p_reviewer_id uuid, p_notes text default null
) returns jsonb language plpgsql security definer
set search_path = public, private, auth as $function$
declare req public.role_requests%rowtype; caller_id uuid; app jsonb; v_email_confirmed_at timestamptz;
begin
  caller_id := auth.uid();
  if caller_id is null or caller_id <> p_reviewer_id or not private.vtg_is_admin() then
    raise exception 'Administrator access required' using errcode='42501';
  end if;
  if p_decision not in ('approved','rejected') then raise exception 'Decision must be approved or rejected'; end if;
  select * into req from public.role_requests where id=p_request_id for update;
  if not found then raise exception 'Role request not found'; end if;
  if req.status <> 'pending' then raise exception 'Role request already reviewed'; end if;
  if req.requested_role not in ('supplier'::public.vtg_account_role,'bank'::public.vtg_account_role) then
    raise exception 'Internal staff roles are invitation-only';
  end if;
  select u.email_confirmed_at into v_email_confirmed_at from auth.users u where u.id=req.user_id;
  if v_email_confirmed_at is null then
    raise exception 'Applicant must verify their email before an administrator decision can be recorded';
  end if;
  if not exists (select 1 from public.profiles p where p.id=req.user_id
    and p.role='buyer'::public.vtg_account_role and p.is_active=true and p.account_environment='trade') then
    raise exception 'Applicant account is no longer eligible for this business-role review';
  end if;
  app := coalesce(req.application_data,'{}'::jsonb);
  if p_decision='approved' then
    if req.requested_role='supplier' then
      insert into public.supplier_profiles as sp(user_id,company_name,registration_no,country,city,verification_status)
      values(req.user_id,req.organization_name,nullif(app->>'registration_no',''),coalesce(nullif(req.country,''),'China'),nullif(app->>'city',''),'pending')
      on conflict(user_id) do update set company_name=excluded.company_name,registration_no=coalesce(excluded.registration_no,sp.registration_no),country=excluded.country,city=coalesce(excluded.city,sp.city);
    elsif req.requested_role='bank' then
      insert into public.bank_profiles as bp(user_id,bank_name,swift_code,branch_name,officer_name,officer_title,verification_status)
      values(req.user_id,req.organization_name,coalesce(nullif(app->>'swiftCode',''),nullif(app->>'swift_code','')),coalesce(nullif(app->>'branch',''),nullif(app->>'branch_name','')),coalesce(nullif(app->>'full_name',''),nullif(app->>'fullName','')),coalesce(nullif(app->>'officerTitle',''),nullif(app->>'officer_title','')),'pending')
      on conflict(user_id) do update set bank_name=excluded.bank_name,swift_code=coalesce(excluded.swift_code,bp.swift_code),branch_name=coalesce(excluded.branch_name,bp.branch_name),officer_name=coalesce(excluded.officer_name,bp.officer_name),officer_title=coalesce(excluded.officer_title,bp.officer_title);
    end if;
    update public.profiles set role=req.requested_role::public.vtg_account_role,updated_at=now() where id=req.user_id;
  end if;
  update public.role_requests set status=p_decision,reviewer_id=caller_id,reviewer_notes=nullif(trim(coalesce(p_notes,'')),''),reviewed_at=now() where id=req.id;
  insert into public.audit_events(actor_id,event_type,entity_type,entity_id,details)
  values(caller_id,'role_request_'||p_decision,'role_request',req.id,jsonb_build_object('user_id',req.user_id,'requested_role',req.requested_role,'notes',p_notes));
  return jsonb_build_object('id',req.id,'status',p_decision,'user_id',req.user_id,'role',req.requested_role);
end; $function$;
revoke all on function public.vtg_admin_review_role_request(uuid,text,uuid,text) from public,anon;
grant execute on function public.vtg_admin_review_role_request(uuid,text,uuid,text) to authenticated;

-- Supplier profile writes are available only to an approved, active trade supplier.
-- Verification status itself remains protected by the existing guard trigger.
drop policy if exists "supplier profile owner or admin insert" on public.supplier_profiles;
create policy "active approved suppliers or admins insert supplier profile"
on public.supplier_profiles for insert to authenticated
with check (
  private.vtg_is_admin()
  or (
    user_id=(select auth.uid()) and exists (
      select 1 from public.profiles p where p.id=(select auth.uid())
        and p.role='supplier'::public.vtg_account_role
        and p.is_active=true and p.account_environment='trade'
    )
  )
);

drop policy if exists "supplier profile owner or admin update" on public.supplier_profiles;
create policy "active approved suppliers or admins update supplier profile"
on public.supplier_profiles for update to authenticated
using (
  private.vtg_is_admin()
  or (
    user_id=(select auth.uid()) and exists (
      select 1 from public.profiles p where p.id=(select auth.uid())
        and p.role='supplier'::public.vtg_account_role
        and p.is_active=true and p.account_environment='trade'
    )
  )
)
with check (
  private.vtg_is_admin()
  or (
    user_id=(select auth.uid()) and exists (
      select 1 from public.profiles p where p.id=(select auth.uid())
        and p.role='supplier'::public.vtg_account_role
        and p.is_active=true and p.account_environment='trade'
    )
  )
);

drop policy if exists "supplier profile owner or admin delete" on public.supplier_profiles;
create policy "active approved suppliers or admins delete supplier profile"
on public.supplier_profiles for delete to authenticated
using (
  private.vtg_is_admin()
  or (
    user_id=(select auth.uid()) and exists (
      select 1 from public.profiles p where p.id=(select auth.uid())
        and p.role='supplier'::public.vtg_account_role
        and p.is_active=true and p.account_environment='trade'
    )
  )
);
