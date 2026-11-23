create or replace function private.vtg_profile_has_public_trade_post(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.vtg_trade_posts t
    where t.author_id = p_profile_id
      and t.is_published = true
  );
$function$;

revoke all on function private.vtg_profile_has_public_trade_post(uuid) from public, anon, authenticated;
grant usage on schema private to anon;
grant execute on function private.vtg_profile_has_public_trade_post(uuid) to anon, authenticated;

drop policy if exists "Public can read active Trade Feed author labels" on public.profiles;
create policy "Public can read active Trade Feed author labels"
on public.profiles
for select
to anon, authenticated
using (
  is_active = true
  and (account_environment = 'trade' or role = 'admin'::public.vtg_account_role)
  and private.vtg_profile_has_public_trade_post(id)
);
