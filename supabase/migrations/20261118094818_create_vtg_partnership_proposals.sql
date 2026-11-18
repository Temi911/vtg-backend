create table if not exists public.vtg_partnership_proposals (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  organization text not null,
  contact_person text not null,
  contact_email text not null,
  country text not null,
  country_calling_code text not null,
  phone_number text not null,
  pathway text not null check (pathway in (
    'Trade & Commercial','Logistics & Shipping','Warehouse & Storage',
    'Finance & Payments','Supply & Manufacturing','Technology','Strategic & Institutional'
  )),
  partnership_type text not null,
  markets text,
  offer text not null,
  requested_support text not null,
  additional_context text,
  status text not null default 'pending' check (status in ('pending','in_review','accepted','declined','closed')),
  source_ip_hash text,
  user_agent text,
  email_status text not null default 'pending' check (email_status in ('pending','sent','failed','not_configured')),
  email_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vtg_partnership_proposals_created_at_idx on public.vtg_partnership_proposals (created_at desc);
create index if not exists vtg_partnership_proposals_ip_created_idx on public.vtg_partnership_proposals (source_ip_hash, created_at desc) where source_ip_hash is not null;
create index if not exists vtg_partnership_proposals_status_created_idx on public.vtg_partnership_proposals (status, created_at desc);
alter table public.vtg_partnership_proposals enable row level security;
revoke all on table public.vtg_partnership_proposals from anon, authenticated;
grant all on table public.vtg_partnership_proposals to service_role;
comment on table public.vtg_partnership_proposals is 'Private public-site partnership intake records. Access only through the vtg-partnerships Edge Function.';
