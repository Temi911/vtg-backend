-- VTG account-linked trade feed: posts, comments and reactions.
create table if not exists public.vtg_trade_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  post_type text not null default 'update' check (post_type in ('update','question','insight')),
  created_at timestamptz not null default now()
);
create index if not exists vtg_trade_posts_created_at_idx on public.vtg_trade_posts (created_at desc);
create table if not exists public.vtg_trade_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.vtg_trade_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists vtg_trade_post_comments_post_created_idx on public.vtg_trade_post_comments (post_id, created_at asc);
create table if not exists public.vtg_trade_post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.vtg_trade_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null default 'like' check (reaction = 'like'),
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);
create index if not exists vtg_trade_post_reactions_post_idx on public.vtg_trade_post_reactions (post_id);
alter table public.vtg_trade_posts enable row level security;
alter table public.vtg_trade_post_comments enable row level security;
alter table public.vtg_trade_post_reactions enable row level security;
grant select, insert, update, delete on public.vtg_trade_posts to authenticated;
grant select, insert, delete on public.vtg_trade_post_comments to authenticated;
grant select, insert, delete on public.vtg_trade_post_reactions to authenticated;
create policy "Signed-in members can read trade posts" on public.vtg_trade_posts for select to authenticated using (true);
create policy "Active members can publish own trade posts" on public.vtg_trade_posts for insert to authenticated with check (author_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_active = true));
create policy "Authors can edit own trade posts" on public.vtg_trade_posts for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "Authors can delete own trade posts" on public.vtg_trade_posts for delete to authenticated using (author_id = (select auth.uid()));
create policy "Signed-in members can read trade comments" on public.vtg_trade_post_comments for select to authenticated using (exists (select 1 from public.vtg_trade_posts p where p.id = post_id));
create policy "Active members can comment as themselves" on public.vtg_trade_post_comments for insert to authenticated with check (author_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_active = true) and exists (select 1 from public.vtg_trade_posts p where p.id = post_id));
create policy "Authors can delete own trade comments" on public.vtg_trade_post_comments for delete to authenticated using (author_id = (select auth.uid()));
create policy "Signed-in members can read trade reactions" on public.vtg_trade_post_reactions for select to authenticated using (exists (select 1 from public.vtg_trade_posts p where p.id = post_id));
create policy "Active members can react as themselves" on public.vtg_trade_post_reactions for insert to authenticated with check (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_active = true) and exists (select 1 from public.vtg_trade_posts p where p.id = post_id));
create policy "Members can remove own trade reactions" on public.vtg_trade_post_reactions for delete to authenticated using (user_id = (select auth.uid()));
