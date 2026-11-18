create table if not exists public.vtg_contact_enquiries (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  category text not null check (category in ('Trade Support','Marketplace Support','Logistics & Shipping','Finance & Payments','Supplier Support','Complaints & Resolution')),
  topic text not null,
  contact_type text not null check (contact_type in ('Individual','Company / Organization')),
  full_name text not null,
  email text not null,
  country text not null,
  calling_code text not null,
  phone text not null,
  company text,
  enquiry_reference text,
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open','in_review','resolved','closed')),
  email_status text not null default 'not_configured' check (email_status in ('not_configured','sent','failed')),
  email_error text,
  source_ip_hash text not null,
  user_agent text,
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vtg_contact_enquiries_created_at_idx on public.vtg_contact_enquiries (created_at desc);
create index if not exists vtg_contact_enquiries_ip_created_at_idx on public.vtg_contact_enquiries (source_ip_hash, created_at desc);
alter table public.vtg_contact_enquiries enable row level security;
revoke all on table public.vtg_contact_enquiries from public, anon, authenticated;
grant all on table public.vtg_contact_enquiries to service_role;
