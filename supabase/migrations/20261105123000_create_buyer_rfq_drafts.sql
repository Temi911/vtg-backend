-- Private buyer-owned RFQ drafts. Saving a draft does not create or send a supplier request.
create table if not exists public.buyer_rfq_drafts (
 id uuid primary key default gen_random_uuid(),
 buyer_id uuid not null references auth.users(id) on delete cascade,
 product text not null check (char_length(btrim(product)) between 1 and 180),
 sourcing_country text not null check (sourcing_country in ('China','South Korea','Open to options')),
 quantity numeric not null check (quantity > 0),
 destination text not null check (destination in ('Nigeria','Ghana','Kenya','South Africa','Other African market')),
 specifications text check (specifications is null or char_length(specifications) <= 5000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists buyer_rfq_drafts_owner_created_idx on public.buyer_rfq_drafts(buyer_id,created_at desc);
alter table public.buyer_rfq_drafts enable row level security;
grant select,insert,update,delete on public.buyer_rfq_drafts to authenticated;
create policy "Buyers read their RFQ drafts" on public.buyer_rfq_drafts for select to authenticated using (buyer_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='buyer' and p.is_active=true));
create policy "Active buyers create RFQ drafts" on public.buyer_rfq_drafts for insert to authenticated with check (buyer_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='buyer' and p.is_active=true));
create policy "Buyers update their RFQ drafts" on public.buyer_rfq_drafts for update to authenticated using (buyer_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='buyer' and p.is_active=true)) with check (buyer_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='buyer' and p.is_active=true));
create policy "Buyers delete their RFQ drafts" on public.buyer_rfq_drafts for delete to authenticated using (buyer_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='buyer' and p.is_active=true));
