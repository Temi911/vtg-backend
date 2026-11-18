-- Remove legacy authenticated SELECT policies that bypassed publication state.
drop policy if exists "Signed-in members can read trade posts" on public.vtg_trade_posts;
drop policy if exists "Signed-in members can read trade comments" on public.vtg_trade_post_comments;
drop policy if exists "Signed-in members can read trade reactions" on public.vtg_trade_post_reactions;

-- A narrowly scoped, read-only profile projection for public Trade Feed author labels.
create or replace view public.vtg_public_trade_profiles
with (security_barrier=true)
as
select id, full_name, role, country
from public.profiles
where is_active=true;
grant select on public.vtg_public_trade_profiles to anon, authenticated;
