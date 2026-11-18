drop policy if exists "Active members can publish own trade posts" on public.vtg_trade_posts;
create policy "Active members can publish own trade posts" on public.vtg_trade_posts for insert to authenticated
with check (
 author_id=(select auth.uid()) and is_published=true
 and exists (
  select 1 from public.profiles p where p.id=(select auth.uid()) and p.is_active=true
  and (p.account_environment='trade' or p.role='admin')
  and (
   (post_type in ('advert','product') and p.role in ('supplier','admin'))
   or (post_type='announcement' and p.role in ('supplier','bank','admin'))
   or post_type in ('update','news','trade_tip','video')
  )
 )
);
drop policy if exists "Active members can comment as themselves" on public.vtg_trade_post_comments;
create policy "Active members can comment as themselves" on public.vtg_trade_post_comments for insert to authenticated
with check (author_id=(select auth.uid())
 and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.is_active=true and (p.account_environment='trade' or p.role='admin'))
 and exists(select 1 from public.vtg_trade_posts p where p.id=post_id and p.is_published=true));
drop policy if exists "Active members can react as themselves" on public.vtg_trade_post_reactions;
create policy "Active members can react as themselves" on public.vtg_trade_post_reactions for insert to authenticated
with check (user_id=(select auth.uid())
 and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.is_active=true and (p.account_environment='trade' or p.role='admin'))
 and exists(select 1 from public.vtg_trade_posts p where p.id=post_id and p.is_published=true));
drop policy if exists "Active members can follow accounts" on public.vtg_user_follows;
create policy "Active members can follow accounts" on public.vtg_user_follows for insert to authenticated
with check (follower_id=(select auth.uid())
 and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.is_active=true and (p.account_environment='trade' or p.role='admin'))
 and exists(select 1 from public.profiles p where p.id=following_id and p.is_active=true and (p.account_environment='trade' or p.role='admin')));
drop policy if exists "Active members can attach media to own posts" on public.vtg_trade_post_media;
create policy "Active members can attach media to own posts" on public.vtg_trade_post_media for insert to authenticated
with check (exists(select 1 from public.vtg_trade_posts p join public.profiles pr on pr.id=(select auth.uid())
 where p.id=post_id and p.author_id=(select auth.uid()) and pr.is_active=true and (pr.account_environment='trade' or pr.role='admin')));
drop policy if exists "Public can read active Trade Feed author labels" on public.profiles;
create policy "Public can read active Trade Feed author labels" on public.profiles for select to anon,authenticated
using (is_active=true and (account_environment='trade' or role='admin')
 and exists(select 1 from public.vtg_trade_posts t where t.author_id=profiles.id and t.is_published=true));
drop policy if exists "VTG trade feed media owner insert" on storage.objects;
create policy "VTG trade feed media owner insert" on storage.objects for insert to authenticated
with check (bucket_id='vtg-trade-feed-media' and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.is_active=true and (p.account_environment='trade' or p.role='admin')));
