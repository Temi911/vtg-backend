drop view if exists public.vtg_public_trade_profiles;
grant select (id,full_name,role,country) on public.profiles to anon,authenticated;
drop policy if exists "Public can read active Trade Feed author labels" on public.profiles;
create policy "Public can read active Trade Feed author labels"
on public.profiles for select to anon,authenticated
using (
 is_active=true
 and exists (
  select 1 from public.vtg_trade_posts t
  where t.author_id=profiles.id and t.is_published=true
 )
);
create index if not exists vtg_trade_posts_author_idx on public.vtg_trade_posts(author_id);
create index if not exists vtg_trade_post_comments_author_idx on public.vtg_trade_post_comments(author_id);
create index if not exists vtg_trade_post_reactions_user_idx on public.vtg_trade_post_reactions(user_id);
create index if not exists vtg_user_follows_following_idx on public.vtg_user_follows(following_id);
drop policy if exists "Authors can edit own trade posts" on public.vtg_trade_posts;
create policy "Authors can edit own trade posts" on public.vtg_trade_posts for update to authenticated
using (author_id=(select auth.uid())) with check (author_id=(select auth.uid()));
drop policy if exists "Authors can delete own trade posts" on public.vtg_trade_posts;
create policy "Authors can delete own trade posts" on public.vtg_trade_posts for delete to authenticated
using (author_id=(select auth.uid()));
drop policy if exists "Active members can attach media to own posts" on public.vtg_trade_post_media;
create policy "Active members can attach media to own posts" on public.vtg_trade_post_media for insert to authenticated
with check (exists(select 1 from public.vtg_trade_posts p join public.profiles pr on pr.id=(select auth.uid())
 where p.id=post_id and p.author_id=(select auth.uid()) and pr.is_active=true));
drop policy if exists "Active members can comment as themselves" on public.vtg_trade_post_comments;
create policy "Active members can comment as themselves" on public.vtg_trade_post_comments for insert to authenticated
with check (author_id=(select auth.uid())
 and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.is_active=true)
 and exists(select 1 from public.vtg_trade_posts p where p.id=post_id and p.is_published=true));
drop policy if exists "Authors can delete own trade comments" on public.vtg_trade_post_comments;
create policy "Authors can delete own trade comments" on public.vtg_trade_post_comments for delete to authenticated
using (author_id=(select auth.uid()));
drop policy if exists "Active members can react as themselves" on public.vtg_trade_post_reactions;
create policy "Active members can react as themselves" on public.vtg_trade_post_reactions for insert to authenticated
with check (user_id=(select auth.uid())
 and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.is_active=true)
 and exists(select 1 from public.vtg_trade_posts p where p.id=post_id and p.is_published=true));
drop policy if exists "Members can remove own trade reactions" on public.vtg_trade_post_reactions;
create policy "Members can remove own trade reactions" on public.vtg_trade_post_reactions for delete to authenticated
using (user_id=(select auth.uid()));
drop policy if exists "Members can read own follow graph" on public.vtg_user_follows;
create policy "Members can read own follow graph" on public.vtg_user_follows for select to authenticated
using (follower_id=(select auth.uid()) or following_id=(select auth.uid()));
drop policy if exists "Active members can follow accounts" on public.vtg_user_follows;
create policy "Active members can follow accounts" on public.vtg_user_follows for insert to authenticated
with check (follower_id=(select auth.uid())
 and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.is_active=true)
 and exists(select 1 from public.profiles p where p.id=following_id and p.is_active=true));
drop policy if exists "Members can unfollow accounts" on public.vtg_user_follows;
create policy "Members can unfollow accounts" on public.vtg_user_follows for delete to authenticated
using (follower_id=(select auth.uid()));
