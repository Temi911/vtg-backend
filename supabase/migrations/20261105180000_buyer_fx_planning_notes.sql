create table if not exists public.buyer_fx_planning_notes (
 id uuid primary key default gen_random_uuid(),
 buyer_id uuid not null references auth.users(id) on delete cascade,
 amount numeric(24,8) not null check (amount > 0),
 rate numeric(24,12) not null check (rate > 0),
 from_currency text not null check (from_currency in ('USD','CNY','KRW','NGN')),
 to_currency text not null check (to_currency in ('USD','CNY','KRW','NGN')),
 result numeric(30,8) not null check (result >= 0),
 rate_source text not null default 'User-entered rate' check (char_length(rate_source) <= 180),
 rate_as_of date,
 note text check (char_length(note) <= 1000),
 created_at timestamptz not null default now()
);
alter table public.buyer_fx_planning_notes enable row level security;
revoke all on table public.buyer_fx_planning_notes from anon, authenticated;
grant select, insert, delete on table public.buyer_fx_planning_notes to authenticated;
create policy buyer_fx_notes_select_own_active_buyer on public.buyer_fx_planning_notes for select to authenticated using (buyer_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='buyer' and p.is_active=true));
create policy buyer_fx_notes_insert_own_active_buyer on public.buyer_fx_planning_notes for insert to authenticated with check (buyer_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='buyer' and p.is_active=true));
create policy buyer_fx_notes_delete_own_active_buyer on public.buyer_fx_planning_notes for delete to authenticated using (buyer_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='buyer' and p.is_active=true));
create index if not exists buyer_fx_planning_notes_buyer_created_idx on public.buyer_fx_planning_notes (buyer_id,created_at desc);