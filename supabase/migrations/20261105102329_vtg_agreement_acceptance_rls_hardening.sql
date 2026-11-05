drop function if exists public.vtg_get_agreement_status();
drop function if exists public.vtg_accept_current_agreement(text,text,text);
alter table public.vtg_user_agreement_acceptances
  add constraint vtg_user_agreement_current_versions_check
  check (agreement_version='2026-09-01' and privacy_version='2026-09-01' and terms_version='2026-09-01');
create policy "Users can read their own VTG agreement acceptance"
on public.vtg_user_agreement_acceptances for select to authenticated
using ((select auth.uid())=user_id);
create policy "Users can record only their own current VTG agreement acceptance"
on public.vtg_user_agreement_acceptances for insert to authenticated
with check ((select auth.uid())=user_id and agreement_version='2026-09-01'
  and privacy_version='2026-09-01' and terms_version='2026-09-01');
grant select,insert on public.vtg_user_agreement_acceptances to authenticated;
revoke update,delete on public.vtg_user_agreement_acceptances from authenticated;

create or replace function public.vtg_get_agreement_status()
returns jsonb language plpgsql security invoker set search_path=''
as $function$
declare v_user uuid:=auth.uid(); v_role text; v_environment text; v_accepted_at timestamptz;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='28000'; end if;
 select p.role::text,p.account_environment into v_role,v_environment
 from public.profiles p where p.id=v_user and p.is_active=true;
 if not found then raise exception 'Active VTG account not found' using errcode='42501'; end if;
 if v_environment<>'trade' or v_role not in ('buyer','supplier','bank') then
   return jsonb_build_object('required',false,'account_environment',v_environment);
 end if;
 select a.accepted_at into v_accepted_at from public.vtg_user_agreement_acceptances a
 where a.user_id=v_user and a.agreement_version='2026-09-01';
 return jsonb_build_object('required',v_accepted_at is null,'accepted',v_accepted_at is not null,
  'accepted_at',v_accepted_at,'agreement_version','2026-09-01','privacy_version','2026-09-01',
  'terms_version','2026-09-01','account_environment',v_environment,'role',v_role);
end;
$function$;

create or replace function public.vtg_accept_current_agreement(p_agreement_version text,p_privacy_version text,p_terms_version text)
returns jsonb language plpgsql security invoker set search_path=''
as $function$
declare v_user uuid:=auth.uid(); v_role text; v_environment text; v_accepted_at timestamptz;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if p_agreement_version is distinct from '2026-09-01' or p_privacy_version is distinct from '2026-09-01'
    or p_terms_version is distinct from '2026-09-01' then
   raise exception 'The agreement version is not current. Please reload the page.' using errcode='22023';
 end if;
 select p.role::text,p.account_environment into v_role,v_environment
 from public.profiles p where p.id=v_user and p.is_active=true;
 if not found or v_environment<>'trade' or v_role not in ('buyer','supplier','bank') then
   raise exception 'This account is not eligible for the public trade agreement' using errcode='42501';
 end if;
 insert into public.vtg_user_agreement_acceptances(user_id,agreement_version,privacy_version,terms_version)
 values(v_user,'2026-09-01','2026-09-01','2026-09-01') on conflict(user_id,agreement_version) do nothing;
 select a.accepted_at into v_accepted_at from public.vtg_user_agreement_acceptances a
 where a.user_id=v_user and a.agreement_version='2026-09-01';
 return jsonb_build_object('accepted',true,'accepted_at',v_accepted_at,'agreement_version','2026-09-01',
  'privacy_version','2026-09-01','terms_version','2026-09-01');
end;
$function$;
revoke all on function public.vtg_get_agreement_status() from public,anon;
revoke all on function public.vtg_accept_current_agreement(text,text,text) from public,anon;
grant execute on function public.vtg_get_agreement_status() to authenticated;
grant execute on function public.vtg_accept_current_agreement(text,text,text) to authenticated;
