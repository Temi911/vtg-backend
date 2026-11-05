create table if not exists public.buyer_trade_requests (
 id uuid primary key default gen_random_uuid(),
 reference text not null unique,
 buyer_id uuid not null references auth.users(id) on delete cascade,
 product text not null check (char_length(product) between 1 and 160),
 sourcing_market text not null check (sourcing_market in ('China','South Korea','Either')),
 quantity numeric not null check (quantity > 0),
 destination text not null check (destination in ('Nigeria','Ghana','Kenya','South Africa','Other African market')),
 specifications text,
 status text not null default 'open' check (status in ('open','quoted','accepted','closed')),
 accepted_quote_id uuid,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.supplier_trade_quotations (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null references public.buyer_trade_requests(id) on delete cascade,
 supplier_id uuid not null references auth.users(id) on delete cascade,
 supplier_company text not null,
 currency text not null default 'USD' check (currency in ('USD','CNY','KRW','NGN')),
 unit_price numeric not null check (unit_price > 0),
 lead_time text not null,
 incoterms text not null,
 validity text,
 notes text,
 status text not null default 'submitted' check (status in ('submitted','countered','accepted','declined')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(request_id,supplier_id)
);
do $ begin
 if not exists (select 1 from pg_constraint where conname='buyer_trade_requests_accepted_quote_id_fkey') then
  alter table public.buyer_trade_requests add constraint buyer_trade_requests_accepted_quote_id_fkey foreign key (accepted_quote_id) references public.supplier_trade_quotations(id) on delete set null;
 end if;
end $;
alter table public.buyer_trade_requests enable row level security;
alter table public.supplier_trade_quotations enable row level security;
grant select, insert, update on public.buyer_trade_requests to authenticated;
grant select, insert, update on public.supplier_trade_quotations to authenticated;
drop policy if exists "buyers create own trade requests" on public.buyer_trade_requests;
create policy "buyers create own trade requests" on public.buyer_trade_requests for insert to authenticated with check (buyer_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='buyer' and p.is_active=true));
drop policy if exists "buyers and active suppliers read trade requests" on public.buyer_trade_requests;
create policy "buyers and active suppliers read trade requests" on public.buyer_trade_requests for select to authenticated using ((buyer_id=(select auth.uid())) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='supplier' and p.is_active=true));
drop policy if exists "buyers update own trade requests" on public.buyer_trade_requests;
create policy "buyers update own trade requests" on public.buyer_trade_requests for update to authenticated using (buyer_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='buyer' and p.is_active=true)) with check (buyer_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='buyer' and p.is_active=true));
drop policy if exists "suppliers submit own quotations" on public.supplier_trade_quotations;
create policy "suppliers submit own quotations" on public.supplier_trade_quotations for insert to authenticated with check (supplier_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='supplier' and p.is_active=true) and exists(select 1 from public.buyer_trade_requests r where r.id=request_id and r.status in ('open','quoted')));
drop policy if exists "buyers and suppliers read relevant quotations" on public.supplier_trade_quotations;
create policy "buyers and suppliers read relevant quotations" on public.supplier_trade_quotations for select to authenticated using (supplier_id=(select auth.uid()) or exists(select 1 from public.buyer_trade_requests r where r.id=request_id and r.buyer_id=(select auth.uid())));
drop policy if exists "suppliers update own quotations" on public.supplier_trade_quotations;
create policy "suppliers update own quotations" on public.supplier_trade_quotations for update to authenticated using (supplier_id=(select auth.uid())) with check (supplier_id=(select auth.uid()));
drop policy if exists "buyers accept relevant quotations" on public.supplier_trade_quotations;
create policy "buyers accept relevant quotations" on public.supplier_trade_quotations for update to authenticated using (exists(select 1 from public.buyer_trade_requests r where r.id=request_id and r.buyer_id=(select auth.uid()))) with check (exists(select 1 from public.buyer_trade_requests r where r.id=request_id and r.buyer_id=(select auth.uid())));
