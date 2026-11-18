-- Private, one-time unsubscribe credentials for Supabase-backed email preferences.
create table if not exists public.vtg_email_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  marketing_subscribed boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists public.vtg_email_preference_tokens (
  token_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists vtg_email_preference_tokens_user_created_idx
  on public.vtg_email_preference_tokens(user_id, created_at desc);
alter table public.vtg_email_preferences enable row level security;
alter table public.vtg_email_preference_tokens enable row level security;
revoke all on public.vtg_email_preferences from anon, authenticated;
revoke all on public.vtg_email_preference_tokens from anon, authenticated;
grant all on public.vtg_email_preferences to service_role;
grant all on public.vtg_email_preference_tokens to service_role;
