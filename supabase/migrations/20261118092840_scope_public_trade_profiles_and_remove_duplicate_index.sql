drop index if exists public.vtg_trade_post_comments_post_idx;
create or replace view public.vtg_public_trade_profiles
with (security_barrier=true)
as
select p.id,p.full_name,p.role,p.country
from public.profiles p
where p.is_active=true
  and exists (select 1 from public.vtg_trade_posts t where t.author_id=p.id and t.is_published=true);
grant select on public.vtg_public_trade_profiles to anon,authenticated;
