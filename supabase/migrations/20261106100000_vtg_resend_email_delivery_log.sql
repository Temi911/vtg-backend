create table if not exists public.vtg_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_key text not null unique,
  event_type text not null,
  recipient_email text not null,
  resend_message_id text,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists vtg_email_deliveries_user_created_idx
  on public.vtg_email_deliveries(user_id, created_at desc);

alter table public.vtg_email_deliveries enable row level security;
revoke all on public.vtg_email_deliveries from anon, authenticated;
grant all on public.vtg_email_deliveries to service_role;

comment on table public.vtg_email_deliveries is
  'Server-only delivery ledger for VTG transactional emails. No client access; Resend message IDs and retry status are recorded here.';
