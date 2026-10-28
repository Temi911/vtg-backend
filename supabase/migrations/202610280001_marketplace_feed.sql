-- VTG marketplace feed foundation.
-- This migration is intentionally reviewed in source control first; do not apply
-- to a shared Supabase project until the project/environment is confirmed.
create table if not exists public.marketplace_feed_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 160),
  author_role text not null check (author_role in ('buyer','supplier','bank','admin')),
  body text not null check (char_length(trim(body)) between 1 and 5000),
  post_type text not null default 'update' check (post_type in ('update','product','logistics','question')),
  external_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_feed_posts_external_url_check
    check (external_url is null or external_url ~* '^https://[^[:space:]]+$')
);

create index if not exists marketplace_feed_posts_active_created_idx
  on public.marketplace_feed_posts (is_active, created_at desc);

create table if not exists public.marketplace_feed_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.marketplace_feed_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 160),
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists marketplace_feed_comments_post_created_idx
  on public.marketplace_feed_comments (post_id, created_at asc);

create table if not exists public.marketplace_feed_reactions (
  post_id uuid not null references public.marketplace_feed_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null default 'like' check (reaction = 'like'),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.marketplace_feed_posts enable row level security;
alter table public.marketplace_feed_comments enable row level security;
alter table public.marketplace_feed_reactions enable row level security;

drop policy if exists "Active marketplace feed posts are readable" on public.marketplace_feed_posts;
create policy "Active marketplace feed posts are readable"
  on public.marketplace_feed_posts for select
  to anon, authenticated using (is_active = true);

drop policy if exists "Users can create their own marketplace feed posts" on public.marketplace_feed_posts;
create policy "Users can create their own marketplace feed posts"
  on public.marketplace_feed_posts for insert
  to authenticated with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role::text = author_role
        and coalesce(nullif(p.full_name, ''), 'VTG trade member') = author_name
    )
  );

drop policy if exists "Authors can update their own marketplace feed posts" on public.marketplace_feed_posts;
drop policy if exists "Authors can update their own marketplace feed posts" on public.marketplace_feed_posts;

drop policy if exists "Comments on active posts are readable" on public.marketplace_feed_comments;
create policy "Comments on active posts are readable"
  on public.marketplace_feed_comments for select
  to anon, authenticated using (
    exists (select 1 from public.marketplace_feed_posts p where p.id = post_id and p.is_active = true)
  );

drop policy if exists "Users can comment as themselves on active posts" on public.marketplace_feed_comments;
create policy "Users can comment as themselves on active posts"
  on public.marketplace_feed_comments for insert
  to authenticated with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and coalesce(nullif(p.full_name, ''), 'VTG trade member') = author_name
    )
    and exists (select 1 from public.marketplace_feed_posts p where p.id = post_id and p.is_active = true)
  );

drop policy if exists "Reactions on active posts are readable" on public.marketplace_feed_reactions;
create policy "Reactions on active posts are readable"
  on public.marketplace_feed_reactions for select
  to anon, authenticated using (
    exists (select 1 from public.marketplace_feed_posts p where p.id = post_id and p.is_active = true)
  );

drop policy if exists "Users can react as themselves on active posts" on public.marketplace_feed_reactions;
create policy "Users can react as themselves on active posts"
  on public.marketplace_feed_reactions for insert
  to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.marketplace_feed_posts p where p.id = post_id and p.is_active = true)
  );

drop policy if exists "Users can remove their own reactions" on public.marketplace_feed_reactions;
create policy "Users can remove their own reactions"
  on public.marketplace_feed_reactions for delete
  to authenticated using (user_id = (select auth.uid()));

grant select on public.marketplace_feed_posts, public.marketplace_feed_comments, public.marketplace_feed_reactions to anon, authenticated;
grant insert on public.marketplace_feed_posts to authenticated;
grant insert on public.marketplace_feed_comments, public.marketplace_feed_reactions to authenticated;
grant delete on public.marketplace_feed_reactions to authenticated;
