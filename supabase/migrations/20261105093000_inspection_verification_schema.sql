-- VTG inspection pricing and business verification schema.
-- Additive and safe to re-run against an existing VTG database.

alter table public.vtg_inspection_requests
  add column if not exists reference text,
  add column if not exists country text,
  add column if not exists city text,
  add column if not exists supplier_name text,
  add column if not exists supplier_address text,
  add column if not exists supplier_contact text,
  add column if not exists product_name text,
  add column if not exists category text,
  add column if not exists quantity integer,
  add column if not exists service_level text not null default 'standard',
  add column if not exists buyer_fee_usd numeric,
  add column if not exists agent_payout_usd numeric,
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists assigned_at timestamptz,
  add column if not exists inspection_summary text,
  add column if not exists buyer_decision text,
  add column if not exists buyer_notes text;

create unique index if not exists vtg_inspection_requests_reference_uidx
  on public.vtg_inspection_requests(reference) where reference is not null;
create index if not exists vtg_inspection_requests_inspector_status_idx
  on public.vtg_inspection_requests(inspector_id,status,created_at desc);

create table if not exists public.vtg_inspection_pricing (
  id uuid primary key default gen_random_uuid(),
  country text not null check (country in ('China','South Korea')),
  category text not null default 'general-merchandise',
  service_level text not null check (service_level in ('basic','standard','advanced')),
  min_quantity integer not null default 1 check (min_quantity > 0),
  max_quantity integer check (max_quantity is null or max_quantity >= min_quantity),
  buyer_fee_usd numeric not null check (buyer_fee_usd >= 0),
  agent_payout_usd numeric not null check (agent_payout_usd >= 0 and agent_payout_usd <= buyer_fee_usd),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.vtg_inspection_pricing enable row level security;
revoke insert, update, delete on public.vtg_inspection_pricing from anon, authenticated;

create table if not exists public.vtg_verification_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_role text not null check (account_role in ('supplier','bank','agent')),
  doc_type text not null,
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes between 1 and 52428800),
  status text not null default 'pending' check (status in ('pending','verified','rejected')),
  review_notes text,
  reviewer_id uuid references public.profiles(id),
  reviewed_at timestamptz,
  expires_at timestamptz,
  uploaded_at timestamptz not null default now()
);
alter table public.vtg_verification_documents enable row level security;
revoke insert, update, delete on public.vtg_verification_documents from anon, authenticated;

-- Row-level policies are installed separately by the live policy migration.
