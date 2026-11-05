create table if not exists public.buyer_lc_request_drafts (
 id uuid primary key default gen_random_uuid(),
 buyer_id uuid not null references auth.users(id) on delete cascade,
 order_id uuid not null references public.trade_orders(id) on delete restrict,
 issuing_bank_name text not null check (char_length(btrim(issuing_bank_name)) between 2 and 180),
 beneficiary_name text not null check (char_length(btrim(beneficiary_name)) between 2 and 240),
 supplier_country text not null check (supplier_country in ('China','South Korea','Other')),
 requested_amount numeric(20,2) not null check (requested_amount > 0),
 currency text not null check (currency in ('USD','CNY','KRW','NGN')),
 purchase_reference text,
 preferred_lc_type text not null default 'To be advised by bank' check (preferred_lc_type in ('To be advised by bank','Irrevocable documentary LC','Confirmed LC — subject to bank approval')),
 latest_shipment_date date,
 expiry_date date,
 goods_summary text not null check (char_length(btrim(goods_summary)) between 5 and 5000),
 supporting_notes text check (supporting_notes is null or char_length(supporting_notes) <= 5000),
 status text not null default 'draft' check (status = 'draft'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint buyer_lc_draft_dates_check check (latest_shipment_date is null or expiry_date is null or expiry_date >= latest_shipment_date)
);
create index if not exists buyer_lc_request_drafts_buyer_created_idx on public.buyer_lc_request_drafts(buyer_id,created_at desc);
alter table public.buyer_lc_request_drafts enable row level security;
revoke all on public.buyer_lc_request_drafts from anon,authenticated;
grant select,insert,update,delete on public.buyer_lc_request_drafts to authenticated;
create policy "active buyers read own LC request drafts" on public.buyer_lc_request_drafts for select to authenticated using (
 buyer_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='buyer'::public.vtg_account_role and p.is_active=true)
);
create policy "active buyers create own LC request drafts for own orders" on public.buyer_lc_request_drafts for insert to authenticated with check (
 buyer_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='buyer'::public.vtg_account_role and p.is_active=true)
 and exists(select 1 from public.trade_orders o where o.id=order_id and o.buyer_id=(select auth.uid()))
);
create policy "active buyers update own LC request drafts" on public.buyer_lc_request_drafts for update to authenticated using (
 buyer_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='buyer'::public.vtg_account_role and p.is_active=true)
) with check (
 buyer_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='buyer'::public.vtg_account_role and p.is_active=true)
 and exists(select 1 from public.trade_orders o where o.id=order_id and o.buyer_id=(select auth.uid()))
);
create policy "active buyers delete own LC request drafts" on public.buyer_lc_request_drafts for delete to authenticated using (
 buyer_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='buyer'::public.vtg_account_role and p.is_active=true)
);
