-- Verified VTG partner directory and buyer connection requests.
create table if not exists public.vtg_network_connection_requests (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  partner_id uuid not null references auth.users(id) on delete cascade,
  partner_type text not null check (partner_type in ('supplier','bank','agent')),
  note text,
  status text not null default 'pending' check (status in ('pending','accepted','declined','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vtg_network_connection_requests_unique unique (buyer_id, partner_id)
);
alter table public.vtg_network_connection_requests enable row level security;
drop policy if exists "buyers read own network connection requests" on public.vtg_network_connection_requests;
create policy "buyers read own network connection requests" on public.vtg_network_connection_requests
for select to authenticated using (buyer_id = (select auth.uid()));
drop policy if exists "active buyers create own network connection requests" on public.vtg_network_connection_requests;
create policy "active buyers create own network connection requests" on public.vtg_network_connection_requests
for insert to authenticated with check (
  buyer_id = (select auth.uid()) and partner_id <> (select auth.uid())
  and exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='buyer'::public.vtg_account_role and p.is_active=true)
  and exists (select 1 from public.profiles pp where pp.id=partner_id and pp.is_active=true
    and ((partner_type='supplier' and pp.role='supplier'::public.vtg_account_role)
      or (partner_type='bank' and pp.role='bank'::public.vtg_account_role)
      or (partner_type='agent' and pp.role='agent'::public.vtg_account_role)))
);
create or replace function public.vtg_verified_network_directory(p_role text default null)
returns table(partner_id uuid, role text, name text, location text, regions text[], verified_at timestamptz)
language sql security definer set search_path=public,pg_temp as $$
 select s.user_id,'supplier'::text,coalesce(nullif(s.company_name,''),c.trading_name,c.legal_name,'Verified supplier'),
  concat_ws(', ',nullif(s.city,''),nullif(s.country,'')),array_remove(array[nullif(s.country,'')],null),s.verified_at
 from public.supplier_profiles s join public.profiles p on p.id=s.user_id and p.role='supplier'::public.vtg_account_role and p.is_active=true
 left join public.companies c on c.id=s.company_id
 where s.verification_status='verified'::public.vtg_document_status and (p_role is null or p_role='supplier')
 union all
 select b.user_id,'bank'::text,coalesce(nullif(b.bank_name,''),c.trading_name,c.legal_name,'Verified bank'),
  concat_ws(', ',nullif(c.city,''),nullif(c.country,'')),array_remove(array[nullif(c.country,'')],null),b.verified_at
 from public.bank_profiles b join public.profiles p on p.id=b.user_id and p.role='bank'::public.vtg_account_role and p.is_active=true
 left join public.companies c on c.id=b.company_id
 where b.verification_status='verified'::public.vtg_document_status and (p_role is null or p_role='bank')
 union all
 select a.user_id,'agent'::text,coalesce(nullif(a.agency_name,''),c.trading_name,c.legal_name,'Verified inspection agent'),
  concat_ws(', ',nullif(a.city,''),nullif(a.country,'')),coalesce(a.service_regions,array[]::text[]),a.verified_at
 from public.agent_profiles a join public.profiles p on p.id=a.user_id and p.role='agent'::public.vtg_account_role and p.is_active=true
 left join public.companies c on c.id=a.company_id
 where a.verification_status='verified'::public.vtg_document_status and (p_role is null or p_role='agent')
 order by 2,3;
$$;
revoke all on function public.vtg_verified_network_directory(text) from public;
grant execute on function public.vtg_verified_network_directory(text) to authenticated;
grant select,insert on public.vtg_network_connection_requests to authenticated;
