-- VTG base schema (INFERRED).
-- The production project holds these tables, enums and helper functions, but no earlier migration in
-- this repository created them. This file was reconstructed from how the application code and the later
-- migrations use them, so a fresh project can be rebuilt. It is idempotent (create ... if not exists),
-- so applying it to a database that already has these objects changes nothing.
-- Verify against the real production definitions before relying on it for anything security-sensitive.

create extension if not exists pgcrypto;
create schema if not exists private;

do $$ begin create type public.vtg_account_role as enum ('buyer','supplier','bank','agent','admin');
exception when duplicate_object then null; end $$;
do $$ begin create type public.vtg_order_status as enum ('draft','pending','confirmed','in_production','shipped','delivered','completed','cancelled');
exception when duplicate_object then null; end $$;
do $$ begin create type public.vtg_document_status as enum ('pending','verified','rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  legal_name text, trading_name text, city text, country text,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, full_name text not null default '', phone text,
  preferred_language text not null default 'en', country text, city text,
  role public.vtg_account_role not null default 'buyer',
  account_environment text not null default 'trade' check (account_environment in ('trade','staff')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create or replace function private.vtg_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'::public.vtg_account_role and p.is_active = true)
$$;
revoke all on function private.vtg_is_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.vtg_is_admin() to authenticated;

create table if not exists public.buyer_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  buyer_type text not null default 'business', company_name text, registration_no text, state text, address text,
  kyc_status text not null default 'pending', company_id uuid references public.companies(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.supplier_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  company_name text, registration_no text, country text, city text, address text, logo_url text,
  verification_status public.vtg_document_status not null default 'pending', verified_at timestamptz,
  rating numeric not null default 0, company_id uuid references public.companies(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.bank_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  bank_name text, swift_code text, branch_name text, officer_name text, officer_title text, logo_url text,
  verification_status public.vtg_document_status not null default 'pending', verified_at timestamptz,
  company_id uuid references public.companies(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.agent_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  agency_name text, agent_type text, license_number text, country text, city text, logo_url text,
  service_regions text[] not null default '{}',
  verification_status public.vtg_document_status not null default 'pending', verified_at timestamptz,
  company_id uuid references public.companies(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.role_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_role public.vtg_account_role not null,
  organization_name text not null, country text, registration_reference text, message text,
  status text not null default 'pending', reviewer_id uuid, reviewer_notes text,
  created_at timestamptz not null default now(), reviewed_at timestamptz,
  application_data jsonb not null default '{}'::jsonb
);
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id), event_type text not null, entity_type text not null,
  entity_id uuid, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create table if not exists public.vtg_workforce_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null, workspace_role text not null, token_hash text,
  status text not null default 'pending', invited_by uuid references auth.users(id),
  expires_at timestamptz not null default (now() + interval '7 days'), accepted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.vtg_workforce_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade, workspace_role text not null,
  status text not null default 'active', invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.profiles(id) on delete cascade,
  name text not null, category text, description text,
  unit_price numeric not null default 0, currency text not null default 'USD',
  minimum_order_quantity integer not null default 1, hs_code text, lead_time_days integer, origin_country text,
  image_urls text[] not null default '{}', is_active boolean not null default true,
  is_verified boolean not null default false, category_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.trade_orders (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null default ('TO-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  buyer_id uuid not null references auth.users(id), supplier_id uuid not null references auth.users(id),
  product_id uuid references public.products(id), status public.vtg_order_status not null default 'pending',
  quantity integer, unit_price numeric, currency text, incoterm text, origin_port text, destination_port text, notes text,
  source_request_id uuid, source_quote_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.trade_quotes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.trade_orders(id) on delete cascade,
  buyer_id uuid not null references auth.users(id), supplier_id uuid not null references auth.users(id),
  product_id uuid references public.products(id), quantity integer, unit_price numeric, currency text, incoterm text,
  delivery_days integer, valid_until timestamptz, buyer_message text, supplier_message text,
  status text not null default 'requested',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.letters_of_credit (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.trade_orders(id) on delete cascade,
  buyer_id uuid not null references auth.users(id), supplier_id uuid not null references auth.users(id),
  bank_id uuid references auth.users(id), reference text, amount numeric, currency text,
  status text not null default 'requested', expiry_date date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.trade_orders(id) on delete cascade,
  carrier text, tracking_number text, container_number text, origin_port text, destination_port text,
  current_location text, estimated_arrival timestamptz, progress_percent integer, status text,
  created_at timestamptz not null default now()
);
create table if not exists public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  event_type text, description text, location text, event_time timestamptz,
  created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.trade_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id), order_id uuid references public.trade_orders(id),
  document_type text not null, storage_path text not null, file_name text not null, mime_type text,
  file_size_bytes bigint, status public.vtg_document_status not null default 'pending',
  reviewer_id uuid references auth.users(id), review_notes text, created_at timestamptz not null default now()
);
create table if not exists public.vtg_payment_intents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.trade_orders(id),
  payer_id uuid not null references auth.users(id), payee_id uuid not null references auth.users(id),
  amount numeric not null, currency text not null, purpose text not null, status text not null default 'created',
  provider text, provider_reference text, idempotency_key text not null, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.trade_orders(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(), primary key (conversation_id, user_id)
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id), body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.vtg_inspection_requests (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null default ('VTG-INS-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  requested_by uuid not null references auth.users(id), order_id uuid references public.trade_orders(id),
  supplier_id uuid references auth.users(id), inspector_id uuid references auth.users(id),
  product_name text, category text, quantity integer, country text, city text, location text,
  supplier_name text, supplier_address text, supplier_contact text, scope text, inspection_type text,
  service_level text not null default 'standard', status text not null default 'requested',
  payment_status text not null default 'unpaid', requested_date date,
  buyer_fee_usd numeric, agent_payout_usd numeric, inspection_summary text, findings text,
  buyer_decision text, buyer_notes text, assigned_at timestamptz, completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.vtg_inspection_evidence (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.vtg_inspection_requests(id) on delete cascade,
  uploaded_by uuid references auth.users(id), evidence_type text, file_name text, mime_type text,
  file_size_bytes bigint, storage_path text, notes text, created_at timestamptz not null default now()
);
create table if not exists public.vtg_inspection_payments (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.vtg_inspection_requests(id) on delete cascade,
  buyer_id uuid not null references auth.users(id), amount_usd numeric not null, amount_ngn numeric,
  currency text not null default 'USD', provider text, provider_reference text,
  status text not null default 'unpaid', provider_status text, paid_at timestamptz, checkout_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.vtg_inspection_pricing (
  id uuid primary key default gen_random_uuid(),
  country text not null, category text not null, service_level text not null default 'standard',
  min_quantity integer not null default 1, max_quantity integer,
  buyer_fee_usd numeric not null, agent_payout_usd numeric not null default 0,
  active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.vtg_verification_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_role text not null, doc_type text not null, file_name text not null,
  storage_path text not null unique, mime_type text not null, file_size_bytes bigint not null,
  status text not null default 'pending', review_notes text, reviewer_id uuid references public.profiles(id),
  reviewed_at timestamptz, uploaded_at timestamptz not null default now(), expires_at timestamptz
);

create or replace view public.vtg_marketplace_products as
select p.id, p.supplier_id, p.name, p.category, p.description, p.unit_price, p.currency,
       p.minimum_order_quantity, p.hs_code, p.lead_time_days, p.origin_country, p.image_urls, p.created_at,
       coalesce(nullif(s.company_name,''), 'Verified supplier') as supplier_name,
       s.country as supplier_country, s.logo_url as supplier_logo_url, s.rating as supplier_rating,
       true as is_verified
from public.products p
join public.supplier_profiles s on s.user_id = p.supplier_id
where p.is_active = true and s.verification_status = 'verified'::public.vtg_document_status;
grant select on public.vtg_marketplace_products to anon, authenticated;

-- Row level security. Later migrations add the finer-grained trade/negotiation policies.
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.buyer_profiles enable row level security;
alter table public.supplier_profiles enable row level security;
alter table public.bank_profiles enable row level security;
alter table public.agent_profiles enable row level security;
alter table public.role_requests enable row level security;
alter table public.audit_events enable row level security;
alter table public.vtg_workforce_invitations enable row level security;
alter table public.vtg_workforce_members enable row level security;
alter table public.products enable row level security;
alter table public.trade_orders enable row level security;
alter table public.trade_quotes enable row level security;
alter table public.letters_of_credit enable row level security;
alter table public.shipments enable row level security;
alter table public.shipment_events enable row level security;
alter table public.trade_documents enable row level security;
alter table public.vtg_payment_intents enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.vtg_inspection_requests enable row level security;
alter table public.vtg_inspection_evidence enable row level security;
alter table public.vtg_inspection_payments enable row level security;
alter table public.vtg_inspection_pricing enable row level security;
alter table public.vtg_verification_documents enable row level security;

do $$ begin
  create policy "own profile read" on public.profiles for select to authenticated using (id = (select auth.uid()) or private.vtg_is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "own buyer profile" on public.buyer_profiles for select to authenticated using (user_id = (select auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "own supplier profile" on public.supplier_profiles for select to authenticated using (user_id = (select auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "own bank profile" on public.bank_profiles for select to authenticated using (user_id = (select auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "own agent profile" on public.agent_profiles for select to authenticated using (user_id = (select auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "own role requests read" on public.role_requests for select to authenticated using (user_id = (select auth.uid()) or private.vtg_is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "own workforce membership" on public.vtg_workforce_members for select to authenticated using (user_id = (select auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "active products visible" on public.products for select to authenticated using (is_active = true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "order participants read orders" on public.trade_orders for select to authenticated
    using (buyer_id = (select auth.uid()) or supplier_id = (select auth.uid()) or private.vtg_is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "quote participants read quotes" on public.trade_quotes for select to authenticated
    using (buyer_id = (select auth.uid()) or supplier_id = (select auth.uid()) or private.vtg_is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "lc participants read" on public.letters_of_credit for select to authenticated
    using (buyer_id = (select auth.uid()) or supplier_id = (select auth.uid()) or bank_id = (select auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "order participants read shipments" on public.shipments for select to authenticated
    using (exists (select 1 from public.trade_orders o where o.id = order_id and ((select auth.uid()) in (o.buyer_id, o.supplier_id))));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "order participants read shipment events" on public.shipment_events for select to authenticated
    using (exists (select 1 from public.shipments s join public.trade_orders o on o.id = s.order_id where s.id = shipment_id and ((select auth.uid()) in (o.buyer_id, o.supplier_id))));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "own conversation membership" on public.conversation_participants for select to authenticated using (user_id = (select auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "own inspection requests" on public.vtg_inspection_requests for select to authenticated
    using (requested_by = (select auth.uid()) or inspector_id = (select auth.uid()) or private.vtg_is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "own inspection payments" on public.vtg_inspection_payments for select to authenticated using (buyer_id = (select auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "own verification documents" on public.vtg_verification_documents for select to authenticated
    using (user_id = (select auth.uid()) or private.vtg_is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "own payment intents" on public.vtg_payment_intents for select to authenticated
    using (payer_id = (select auth.uid()) or payee_id = (select auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "own trade documents" on public.trade_documents for select to authenticated using (owner_id = (select auth.uid()));
exception when duplicate_object then null; end $$;

grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.buyer_profiles, public.supplier_profiles, public.bank_profiles, public.agent_profiles,
  public.role_requests, public.vtg_workforce_members, public.trade_orders, public.trade_quotes, public.letters_of_credit,
  public.shipments, public.shipment_events, public.conversation_participants, public.vtg_inspection_requests,
  public.vtg_inspection_payments, public.vtg_verification_documents, public.vtg_payment_intents, public.trade_documents to authenticated;
grant select on public.products to authenticated;
