-- Supabase-native inspection payment ledger for verified Paystack collections.
create table if not exists public.vtg_inspection_payments (
 id uuid primary key default gen_random_uuid(),
 inspection_id uuid not null unique references public.vtg_inspection_requests(id) on delete cascade,
 buyer_id uuid not null references auth.users(id),
 amount_usd numeric(12,2) not null check(amount_usd > 0),
 amount_ngn numeric(14,2),
 currency text not null default 'USD',
 provider text,
 provider_reference text unique,
 status text not null default 'unpaid' check(status in ('unpaid','pending','paid','failed','abandoned')),
 provider_status text,
 checkout_url text,
 paid_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists vtg_inspection_payments_buyer_idx on public.vtg_inspection_payments(buyer_id,created_at desc);
alter table public.vtg_inspection_payments enable row level security;
drop policy if exists "Buyer reads own inspection payments" on public.vtg_inspection_payments;
create policy "Buyer reads own inspection payments" on public.vtg_inspection_payments
 for select to authenticated using (buyer_id=(select auth.uid()));
revoke insert,update,delete on public.vtg_inspection_payments from anon,authenticated;
