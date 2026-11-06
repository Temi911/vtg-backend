create table if not exists public.vtg_user_agreement_acceptances (
  user_id uuid not null references auth.users(id) on delete cascade,
  agreement_version text not null,
  privacy_version text not null,
  terms_version text not null,
  accepted_at timestamptz not null default now(),
  primary key (user_id, agreement_version),
  constraint vtg_user_agreement_versions_nonempty
    check (length(trim(agreement_version)) > 0 and length(trim(privacy_version)) > 0 and length(trim(terms_version)) > 0)
);
alter table public.vtg_user_agreement_acceptances enable row level security;
revoke all on table public.vtg_user_agreement_acceptances from public, anon, authenticated;

create or replace function public.vtg_get_agreement_status()
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_role text;
  v_environment text;
  v_accepted_at timestamptz;
  v_agreement_version constant text := '2026-09-01';
  v_privacy_version constant text := '2026-09-01';
  v_terms_version constant text := '2026-09-01';
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  select p.role::text, p.account_environment into v_role, v_environment
  from public.profiles p where p.id = v_user and p.is_active = true;
  if not found then raise exception 'Active VTG account not found' using errcode = '42501'; end if;
  if v_environment <> 'trade' or v_role not in ('buyer','supplier','bank') then
    return jsonb_build_object('required', false, 'account_environment', v_environment,
      'agreement_version', v_agreement_version, 'privacy_version', v_privacy_version, 'terms_version', v_terms_version);
  end if;
  select a.accepted_at into v_accepted_at from public.vtg_user_agreement_acceptances a
  where a.user_id = v_user and a.agreement_version = v_agreement_version;
  return jsonb_build_object('required', v_accepted_at is null, 'accepted', v_accepted_at is not null,
    'accepted_at', v_accepted_at, 'agreement_version', v_agreement_version,
    'privacy_version', v_privacy_version, 'terms_version', v_terms_version,
    'account_environment', v_environment, 'role', v_role);
end;
$function$;

create or replace function public.vtg_accept_current_agreement(p_agreement_version text,p_privacy_version text,p_terms_version text)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_role text;
  v_environment text;
  v_accepted_at timestamptz;
  v_agreement_version constant text := '2026-09-01';
  v_privacy_version constant text := '2026-09-01';
  v_terms_version constant text := '2026-09-01';
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_agreement_version is distinct from v_agreement_version or p_privacy_version is distinct from v_privacy_version
     or p_terms_version is distinct from v_terms_version then
    raise exception 'The agreement version is not current. Please reload the page.' using errcode = '22023';
  end if;
  select p.role::text, p.account_environment into v_role, v_environment
  from public.profiles p where p.id = v_user and p.is_active = true;
  if not found or v_environment <> 'trade' or v_role not in ('buyer','supplier','bank') then
    raise exception 'This account is not eligible for the public trade agreement' using errcode = '42501';
  end if;
  insert into public.vtg_user_agreement_acceptances(user_id,agreement_version,privacy_version,terms_version)
  values(v_user,v_agreement_version,v_privacy_version,v_terms_version)
  on conflict(user_id,agreement_version) do nothing;
  select a.accepted_at into v_accepted_at from public.vtg_user_agreement_acceptances a
  where a.user_id=v_user and a.agreement_version=v_agreement_version;
  return jsonb_build_object('accepted',true,'accepted_at',v_accepted_at,
    'agreement_version',v_agreement_version,'privacy_version',v_privacy_version,'terms_version',v_terms_version);
end;
$function$;

revoke all on function public.vtg_get_agreement_status() from public, anon;
revoke all on function public.vtg_accept_current_agreement(text,text,text) from public, anon;
grant execute on function public.vtg_get_agreement_status() to authenticated;
grant execute on function public.vtg_accept_current_agreement(text,text,text) to authenticated;
