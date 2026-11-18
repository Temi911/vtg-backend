-- VTG Trade Feed Supabase parity: public read, authenticated writes, media metadata and follows.
alter table public.vtg_trade_posts add column if not exists external_url text, add column if not exists country_code text, add column if not exists is_published boolean not null default true;
create table if not exists public.vtg_trade_post_media (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references public.vtg_trade_posts(id) on delete cascade,
 media_type text not null check(media_type in ('image','video')), storage_path text not null unique, public_url text not null,
 thumbnail_url text, sort_order integer not null default 0, created_at timestamptz not null default now()
);
create table if not exists public.vtg_user_follows (
 follower_id uuid not null references public.profiles(id) on delete cascade,
 following_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(follower_id,following_id),
 constraint vtg_user_follows_no_self check(follower_id<>following_id)
);
create index if not exists vtg_trade_posts_public_created_idx on public.vtg_trade_posts(created_at desc) where is_published=true;
create index if not exists vtg_trade_post_media_post_idx on public.vtg_trade_post_media(post_id,sort_order);
create index if not exists vtg_trade_post_comments_post_idx on public.vtg_trade_post_comments(post_id,created_at);
create index if not exists vtg_trade_post_reactions_post_idx on public.vtg_trade_post_reactions(post_id,reaction);
create index if not exists vtg_user_follows_follower_idx on public.vtg_user_follows(follower_id,created_at desc);
alter table public.vtg_trade_post_media enable row level security;
alter table public.vtg_user_follows enable row level security;
drop policy if exists "Public can read published trade posts" on public.vtg_trade_posts;
create policy "Public can read published trade posts" on public.vtg_trade_posts for select to anon,authenticated using(is_published=true);
drop policy if exists "Public can read comments on published trade posts" on public.vtg_trade_post_comments;
create policy "Public can read comments on published trade posts" on public.vtg_trade_post_comments for select to anon,authenticated using(exists(select 1 from public.vtg_trade_posts p where p.id=post_id and p.is_published=true));
drop policy if exists "Public can read reactions on published trade posts" on public.vtg_trade_post_reactions;
create policy "Public can read reactions on published trade posts" on public.vtg_trade_post_reactions for select to anon,authenticated using(exists(select 1 from public.vtg_trade_posts p where p.id=post_id and p.is_published=true));
drop policy if exists "Public can read media on published trade posts" on public.vtg_trade_post_media;
create policy "Public can read media on published trade posts" on public.vtg_trade_post_media for select to anon,authenticated using(exists(select 1 from public.vtg_trade_posts p where p.id=post_id and p.is_published=true));
drop policy if exists "Active members can attach media to own posts" on public.vtg_trade_post_media;
create policy "Active members can attach media to own posts" on public.vtg_trade_post_media for insert to authenticated with check(exists(select 1 from public.vtg_trade_posts p join public.profiles pr on pr.id=auth.uid() where p.id=post_id and p.author_id=auth.uid() and pr.is_active=true));
drop policy if exists "Active members can publish own trade posts" on public.vtg_trade_posts;
create policy "Active members can publish own trade posts" on public.vtg_trade_posts for insert to authenticated with check(author_id=auth.uid() and is_published=true and exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_active=true));
drop policy if exists "Authors can edit own trade posts" on public.vtg_trade_posts;
create policy "Authors can edit own trade posts" on public.vtg_trade_posts for update to authenticated using(author_id=auth.uid()) with check(author_id=auth.uid());
drop policy if exists "Authors can delete own trade posts" on public.vtg_trade_posts;
create policy "Authors can delete own trade posts" on public.vtg_trade_posts for delete to authenticated using(author_id=auth.uid());
drop policy if exists "Active members can comment as themselves" on public.vtg_trade_post_comments;
create policy "Active members can comment as themselves" on public.vtg_trade_post_comments for insert to authenticated with check(author_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_active=true) and exists(select 1 from public.vtg_trade_posts p where p.id=post_id and p.is_published=true));
drop policy if exists "Authors can delete own trade comments" on public.vtg_trade_post_comments;
create policy "Authors can delete own trade comments" on public.vtg_trade_post_comments for delete to authenticated using(author_id=auth.uid());
drop policy if exists "Active members can react as themselves" on public.vtg_trade_post_reactions;
create policy "Active members can react as themselves" on public.vtg_trade_post_reactions for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_active=true) and exists(select 1 from public.vtg_trade_posts p where p.id=post_id and p.is_published=true));
drop policy if exists "Members can remove own trade reactions" on public.vtg_trade_post_reactions;
create policy "Members can remove own trade reactions" on public.vtg_trade_post_reactions for delete to authenticated using(user_id=auth.uid());
drop policy if exists "Members can read own follow graph" on public.vtg_user_follows;
create policy "Members can read own follow graph" on public.vtg_user_follows for select to authenticated using(follower_id=auth.uid() or following_id=auth.uid());
drop policy if exists "Active members can follow accounts" on public.vtg_user_follows;
create policy "Active members can follow accounts" on public.vtg_user_follows for insert to authenticated with check(follower_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_active=true) and exists(select 1 from public.profiles p where p.id=following_id and p.is_active=true));
drop policy if exists "Members can unfollow accounts" on public.vtg_user_follows;
create policy "Members can unfollow accounts" on public.vtg_user_follows for delete to authenticated using(follower_id=auth.uid());
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('vtg-trade-feed-media','vtg-trade-feed-media',true,20971520,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']) on conflict(id) do update set public=true,file_size_limit=20971520,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "VTG trade feed media public read" on storage.objects;
create policy "VTG trade feed media public read" on storage.objects for select to anon,authenticated using(bucket_id='vtg-trade-feed-media');
drop policy if exists "VTG trade feed media owner insert" on storage.objects;
create policy "VTG trade feed media owner insert" on storage.objects for insert to authenticated with check(bucket_id='vtg-trade-feed-media' and (storage.foldername(name))[1]=auth.uid()::text and exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_active=true));
drop policy if exists "VTG trade feed media owner delete" on storage.objects;
create policy "VTG trade feed media owner delete" on storage.objects for delete to authenticated using(bucket_id='vtg-trade-feed-media' and (storage.foldername(name))[1]=auth.uid()::text);
