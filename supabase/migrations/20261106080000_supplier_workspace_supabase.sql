-- Supplier workspace persistence and safe verified partner directory.
-- Applied to Supabase project lxrurbdzphqvkjprlfuv.

alter table public.supplier_profiles
  add column if not exists business_type text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists website_url text,
  add column if not exists production_capacity text;

create table if not exists public.supplier_workspace_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  record_type text not null check (record_type in (
    'products','checks','profile','store','rfqs','deals','orders',
    'inspections','shipments','documents','finance','messages',
    'tasks','team','support','settings'
  )),
  payload jsonb not null default '[]'::jsonb
    check (jsonb_typeof(payload) in ('array','object')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supplier_workspace_records_user_type_key unique(user_id,record_type)
);

alter table public.supplier_workspace_records enable row level security;
revoke all on public.supplier_workspace_records from anon;
grant select,insert,update,delete on public.supplier_workspace_records to authenticated;

drop policy if exists "Suppliers read own workspace records" on public.supplier_workspace_records;
create policy "Suppliers read own workspace records"
on public.supplier_workspace_records for select to authenticated
using (
  user_id=(select auth.uid()) and exists (
    select 1 from public.profiles p
    where p.id=(select auth.uid()) and p.role='supplier' and p.is_active=true
  )
);

drop policy if exists "Suppliers create own workspace records" on public.supplier_workspace_records;
create policy "Suppliers create own workspace records"
on public.supplier_workspace_records for insert to authenticated
with check (
  user_id=(select auth.uid()) and exists (
    select 1 from public.profiles p
    where p.id=(select auth.uid()) and p.role='supplier' and p.is_active=true
  )
);

drop policy if exists "Suppliers update own workspace records" on public.supplier_workspace_records;
create policy "Suppliers update own workspace records"
on public.supplier_workspace_records for update to authenticated
using (
  user_id=(select auth.uid()) and exists (
    select 1 from public.profiles p
    where p.id=(select auth.uid()) and p.role='supplier' and p.is_active=true
  )
)
with check (
  user_id=(select auth.uid()) and exists (
    select 1 from public.profiles p
    where p.id=(select auth.uid()) and p.role='supplier' and p.is_active=true
  )
);

drop policy if exists "Suppliers delete own workspace records" on public.supplier_workspace_records;
create policy "Suppliers delete own workspace records"
on public.supplier_workspace_records for delete to authenticated
using (
  user_id=(select auth.uid()) and exists (
    select 1 from public.profiles p
    where p.id=(select auth.uid()) and p.role='supplier' and p.is_active=true
  )
);

drop view if exists public.vtg_verified_bank_directory;
create view public.vtg_verified_bank_directory
with (security_invoker=true) as
select user_id,bank_name,branch_name,swift_code,logo_url
from public.bank_profiles
where verification_status='verified';

drop view if exists public.vtg_verified_agent_directory;
create view public.vtg_verified_agent_directory
with (security_invoker=true) as
select user_id,agency_name,agent_type,country,city,logo_url
from public.agent_profiles
where verification_status='verified';

drop policy if exists "Verified banks visible in trade directory" on public.bank_profiles;
create policy "Verified banks visible in trade directory"
on public.bank_profiles for select to anon,authenticated
using (verification_status='verified');

drop policy if exists "Verified agents visible in trade directory" on public.agent_profiles;
create policy "Verified agents visible in trade directory"
on public.agent_profiles for select to anon,authenticated
using (verification_status='verified');

grant select on public.vtg_verified_bank_directory,public.vtg_verified_agent_directory
to anon,authenticated;
