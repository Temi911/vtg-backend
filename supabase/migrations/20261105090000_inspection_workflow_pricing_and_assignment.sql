alter table public.vtg_inspection_requests
 add column if not exists reference text,
 add column if not exists country text,
 add column if not exists city text,
 add column if not exists supplier_name text,
 add column if not exists supplier_address text,
 add column if not exists supplier_contact text,
 add column if not exists product_name text,
 add column if not exists category text,
 add column if not exists quantity integer check(quantity is null or quantity>0),
 add column if not exists service_level text not null default 'standard' check(service_level in ('basic','standard','advanced')),
 add column if not exists buyer_fee_usd numeric(12,2) check(buyer_fee_usd is null or buyer_fee_usd>=0),
 add column if not exists agent_payout_usd numeric(12,2) check(agent_payout_usd is null or agent_payout_usd>=0),
 add column if not exists payment_status text not null default 'unpaid' check(payment_status in ('unpaid','pending','paid','refunded')),
 add column if not exists assigned_at timestamptz,
 add column if not exists inspection_summary text,
 add column if not exists buyer_decision text check(buyer_decision is null or buyer_decision in ('approved','needs_clarification','rejected')),
 add column if not exists buyer_notes text;
create unique index if not exists vtg_inspection_reference_unique on public.vtg_inspection_requests(reference) where reference is not null;
create index if not exists vtg_inspection_agent_queue_idx on public.vtg_inspection_requests(inspector_id,status,created_at desc);
create table if not exists public.vtg_inspection_pricing (
 id uuid primary key default gen_random_uuid(), country text not null check(country in ('China','South Korea')),
 category text not null default 'general-merchandise', service_level text not null check(service_level in ('basic','standard','advanced')),
 min_quantity integer not null default 1 check(min_quantity>0), max_quantity integer check(max_quantity is null or max_quantity>=min_quantity),
 buyer_fee_usd numeric(12,2) not null check(buyer_fee_usd>=0), agent_payout_usd numeric(12,2) not null check(agent_payout_usd>=0 and agent_payout_usd<=buyer_fee_usd),
 active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists vtg_inspection_pricing_lookup_idx on public.vtg_inspection_pricing(country,service_level,category,min_quantity) where active;
alter table public.vtg_inspection_pricing enable row level security;
drop policy if exists "Authenticated can read active inspection pricing" on public.vtg_inspection_pricing;
create policy "Authenticated can read active inspection pricing" on public.vtg_inspection_pricing for select to authenticated using(active);
revoke insert,update,delete on public.vtg_inspection_pricing from anon,authenticated;
grant select on public.vtg_inspection_pricing to authenticated;
