-- Google sign-up: accounts created through "Continue with Google" are created by the existing auth trigger as buyers
-- (Google supplies name and verified email only). This RPC lets the signed-in user add the business details that the
-- sign-up forms normally collect. It never changes a role: supplier/bank choices create a PENDING role request for admin review.
alter table public.profiles add column if not exists onboarding_completed_at timestamptz;
update public.profiles set onboarding_completed_at=coalesce(created_at,now()) where onboarding_completed_at is null;

create or replace function public.vtg_complete_google_profile(p_details jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
 uid uuid := auth.uid();
 prof public.profiles%rowtype;
 want text := lower(coalesce(p_details->>'requested_role','buyer'));
 org text := nullif(trim(coalesce(p_details->>'organization_name','')),'');
 made_request boolean := false;
 allowed text[] := array['full_name','phone','country','city','preferred_language','buyer_type','company_name','registration_no','state','organization_name','registration_reference','license_number','regulator','business_model','product_category','export_markets','trade_years','institution_type','swift_code','branch','officer_title','vtg_services','regulatory_status','markets_served','role_request_message'];
 cleaned jsonb := '{}'::jsonb;
 k text;
begin
 if uid is null then raise exception 'Sign in first' using errcode='28000'; end if;
 select * into prof from public.profiles where id=uid for update;
 if not found then raise exception 'Profile not found' using errcode='P0002'; end if;
 if prof.account_environment is distinct from 'trade' then raise exception 'Staff accounts cannot use this form' using errcode='42501'; end if;
 if want not in ('buyer','supplier','bank') then raise exception 'Unsupported account type' using errcode='22023'; end if;
 for k in select jsonb_object_keys(p_details) loop
  if k = any(allowed) and jsonb_typeof(p_details->k)='string' then
   cleaned := cleaned || jsonb_build_object(k, left(trim(p_details->>k), 500));
  end if;
 end loop;
 if char_length(coalesce(cleaned->>'full_name',''))<2 then raise exception 'Full name is required' using errcode='22023'; end if;
 if char_length(coalesce(cleaned->>'country',''))<2 or char_length(coalesce(cleaned->>'city',''))<2 then raise exception 'Country and city are required' using errcode='22023'; end if;
 if want in ('supplier','bank') and org is null then raise exception 'Organisation name is required' using errcode='22023'; end if;
 if want='supplier' and (cleaned->>'country') not in ('China','South Korea') then raise exception 'Suppliers must be based in China or South Korea' using errcode='22023'; end if;

 update public.profiles set
   full_name=cleaned->>'full_name',
   phone=nullif(cleaned->>'phone',''),
   country=cleaned->>'country',
   city=cleaned->>'city',
   preferred_language=coalesce(nullif(cleaned->>'preferred_language',''),preferred_language,'en'),
   onboarding_completed_at=now(),
   updated_at=now()
 where id=uid;

 insert into public.buyer_profiles(user_id,buyer_type,company_name,registration_no,state)
 values (uid,
   case when cleaned->>'buyer_type' in ('individual','business','dealer','ngo') then cleaned->>'buyer_type' else 'business' end,
   nullif(coalesce(cleaned->>'company_name',org),''),nullif(cleaned->>'registration_no',''),nullif(cleaned->>'state',''))
 on conflict (user_id) do update set
   buyer_type=excluded.buyer_type,
   company_name=coalesce(excluded.company_name,public.buyer_profiles.company_name),
   registration_no=coalesce(excluded.registration_no,public.buyer_profiles.registration_no),
   state=coalesce(excluded.state,public.buyer_profiles.state),
   updated_at=now();

 if want in ('supplier','bank') and prof.role='buyer'
    and not exists (select 1 from public.role_requests r where r.user_id=uid and r.status='pending') then
  insert into public.role_requests(user_id,requested_role,organization_name,country,registration_reference,message,application_data)
  values (uid,want::public.vtg_account_role,org,cleaned->>'country',
    nullif(coalesce(cleaned->>'registration_reference',cleaned->>'license_number'),''),
    nullif(cleaned->>'role_request_message',''),
    cleaned || jsonb_build_object('requested_role',want,'signup_method','google'));
  made_request := true;
 end if;
 return jsonb_build_object('ok',true,'requested_role',want,'role_request_created',made_request);
end $$;

revoke all on function public.vtg_complete_google_profile(jsonb) from public, anon;
grant execute on function public.vtg_complete_google_profile(jsonb) to authenticated;
