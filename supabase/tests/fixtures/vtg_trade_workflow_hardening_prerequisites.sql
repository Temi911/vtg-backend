-- Minimal Supabase schema contract for validating the VTG workflow-hardening migration.
-- This is an isolated CI fixture, not a production migration.
create extension if not exists pgcrypto;
do $$ begin
  create role anon nologin;
exception when duplicate_object then null; end $$;
do $$ begin
  create role authenticated nologin;
exception when duplicate_object then null; end $$;
do $$ begin
  create role service_role nologin bypassrls;
exception when duplicate_object then null; end $$;
create schema if not exists auth;
create schema if not exists private;
create schema if not exists storage;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create or replace function auth.role() returns text language sql stable as $$
  select nullif(current_setting('request.jwt.claim.role', true), '')
$$;
create or replace function private.vtg_is_admin() returns boolean language sql stable as $$ select false $$;
do $$ begin
  create type public.vtg_account_role as enum ('buyer','supplier','bank','admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.vtg_document_status as enum ('pending','verified','rejected');
exception when duplicate_object then null; end $$;

create table auth.users (id uuid primary key);
create table public.profiles (
  id uuid primary key references auth.users(id),
  role public.vtg_account_role not null,
  account_environment text not null default 'trade',
  is_active boolean not null default true
);

create table public.role_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  requested_role public.vtg_account_role not null,
  organization_name text not null,
  country text,
  registration_reference text,
  message text,
  status text not null default 'pending',
  reviewer_id uuid,
  reviewer_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  application_data jsonb not null default '{}'::jsonb
);
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table public.supplier_profiles (
  user_id uuid primary key references auth.users(id),
  verification_status public.vtg_document_status not null default 'pending',
  verified_at timestamptz,
  rating numeric not null default 0,
  company_id uuid
);
create table public.bank_profiles (
  user_id uuid primary key references auth.users(id),
  verification_status public.vtg_document_status not null default 'pending',
  verified_at timestamptz,
  company_id uuid,
  bank_name text,
  branch_name text,
  swift_code text
);
create table public.trade_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id),
  supplier_id uuid not null references auth.users(id),
  product_id uuid,
  status text,
  quantity integer,
  unit_price numeric,
  currency text,
  incoterm text,
  origin_port text,
  destination_port text,
  created_at timestamptz default now()
);
create table public.trade_quotes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.trade_orders(id),
  buyer_id uuid not null references auth.users(id),
  supplier_id uuid not null references auth.users(id),
  status text not null default 'requested'
);
create table public.letters_of_credit (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.trade_orders(id),
  buyer_id uuid not null references auth.users(id),
  supplier_id uuid not null references auth.users(id),
  bank_id uuid references auth.users(id),
  reference text,
  amount numeric,
  currency text,
  status text not null default 'requested',
  expiry_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.trade_orders(id),
  carrier text,
  tracking_number text,
  container_number text,
  origin_port text,
  destination_port text,
  status text,
  created_at timestamptz default now()
);
create table public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id),
  event_type text,
  description text,
  location text,
  event_time timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
create table public.trade_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  order_id uuid references public.trade_orders(id),
  document_type text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size_bytes bigint,
  status public.vtg_document_status not null default 'pending',
  reviewer_id uuid references auth.users(id),
  review_notes text,
  created_at timestamptz not null default now()
);
create table public.vtg_payment_intents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.trade_orders(id),
  payer_id uuid not null references auth.users(id),
  payee_id uuid not null references auth.users(id),
  amount numeric not null,
  currency text not null,
  purpose text not null,
  status text not null default 'created',
  provider text,
  provider_reference text,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.vtg_inspection_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references auth.users(id),
  payment_status text not null default 'unpaid',
  updated_at timestamptz not null default now()
);
create table public.vtg_inspection_payments (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.vtg_inspection_requests(id),
  buyer_id uuid not null references auth.users(id),
  amount_usd numeric not null,
  amount_ngn numeric,
  currency text not null default 'USD',
  provider text,
  provider_reference text,
  status text not null default 'unpaid',
  provider_status text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  checkout_url text
);
create table storage.buckets (id text primary key, name text, public boolean not null default false);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text not null, name text not null);

-- Business verification upload-policy fixture used by the account-approval gate test.
create table public.vtg_verification_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  account_role text not null,
  doc_type text not null,
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  file_size_bytes bigint not null,
  status text not null default 'pending',
  review_notes text,
  reviewer_id uuid references public.profiles(id),
  reviewed_at timestamptz,
  uploaded_at timestamptz not null default now()
);
alter table public.vtg_verification_documents enable row level security;
grant insert on public.vtg_verification_documents to authenticated;
create policy "Active trade users submit own verification documents"
  on public.vtg_verification_documents for insert to authenticated
  with check (
    user_id=(select auth.uid())
    and account_role in ('supplier','bank','agent')
    and exists (
      select 1 from public.profiles p
      where p.id=(select auth.uid())
        and p.is_active=true and p.account_environment='trade'
    )
  );

insert into storage.buckets(id,name,public)
values ('vtg-verification-documents','vtg-verification-documents',false),
       ('vtg-company-logos','vtg-company-logos',true)
on conflict(id) do nothing;
grant usage on schema auth, storage to authenticated;
grant execute on function auth.uid() to authenticated;
grant select on public.profiles to authenticated;
create or replace function storage.foldername(name text)
returns text[] language sql immutable as $
  select array[split_part(name,'/',1)]
$;
alter table storage.objects enable row level security;
grant insert on storage.objects to authenticated;
create policy "Verification owner upload objects"
  on storage.objects for insert to authenticated
  with check (
    bucket_id='vtg-verification-documents'
    and (storage.foldername(name))[1]=(select auth.uid())::text
  );
create policy "Applicants upload own company logos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id='vtg-company-logos'
    and (storage.foldername(name))[1]=(select auth.uid())::text
  );
