create table if not exists public.vtg_account_support_requests (
  id uuid primary key default gen_random_uuid(),
  account_role text not null check (account_role in ('buyer','supplier','bank','admin')),
  contact_email text not null check (length(contact_email) between 3 and 254),
  issue text not null check (length(issue) between 3 and 120),
  description text not null check (length(description) between 10 and 2000),
  status text not null default 'open' check (status in ('open','in_review','resolved','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vtg_account_support_requests_status_created_idx
  on public.vtg_account_support_requests(status, created_at desc);
alter table public.vtg_account_support_requests enable row level security;
revoke all on public.vtg_account_support_requests from anon, authenticated;
grant all on public.vtg_account_support_requests to service_role;
comment on table public.vtg_account_support_requests is 'Private VTG account support inbox. Writes are accepted only through the authenticated server-side Edge Function; no client table access.';
