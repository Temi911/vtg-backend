create or replace function public.vtg_verified_network_directory(p_role text default null)
returns table(partner_id uuid, role text, name text, location text, regions text[], verified_at timestamptz)
language sql security definer set search_path=public,pg_temp as $$
 select s.user_id,'supplier'::text,coalesce(nullif(s.company_name,''),c.trading_name,c.legal_name,'Verified supplier'),concat_ws(', ',nullif(s.city,''),nullif(s.country,'')),array_remove(array[nullif(s.country,'')],null),s.verified_at
 from public.supplier_profiles s join public.profiles p on p.id=s.user_id and p.role='supplier'::public.vtg_account_role and p.is_active=true left join public.companies c on c.id=s.company_id
 where s.verification_status='verified'::public.vtg_document_status and (p_role is null or p_role='supplier') and exists(select 1 from public.profiles viewer where viewer.id=auth.uid() and viewer.role='buyer'::public.vtg_account_role and viewer.is_active=true)
 union all
 select b.user_id,'bank'::text,coalesce(nullif(b.bank_name,''),c.trading_name,c.legal_name,'Verified bank'),concat_ws(', ',nullif(c.city,''),nullif(c.country,'')),array_remove(array[nullif(c.country,'')],null),b.verified_at
 from public.bank_profiles b join public.profiles p on p.id=b.user_id and p.role='bank'::public.vtg_account_role and p.is_active=true left join public.companies c on c.id=b.company_id
 where b.verification_status='verified'::public.vtg_document_status and (p_role is null or p_role='bank') and exists(select 1 from public.profiles viewer where viewer.id=auth.uid() and viewer.role='buyer'::public.vtg_account_role and viewer.is_active=true)
 union all
 select a.user_id,'agent'::text,coalesce(nullif(a.agency_name,''),c.trading_name,c.legal_name,'Verified inspection agent'),concat_ws(', ',nullif(a.city,''),nullif(a.country,'')),coalesce(a.service_regions,array[]::text[]),a.verified_at
 from public.agent_profiles a join public.profiles p on p.id=a.user_id and p.role='agent'::public.vtg_account_role and p.is_active=true left join public.companies c on c.id=a.company_id
 where a.verification_status='verified'::public.vtg_document_status and (p_role is null or p_role='agent') and exists(select 1 from public.profiles viewer where viewer.id=auth.uid() and viewer.role='buyer'::public.vtg_account_role and viewer.is_active=true)
 order by 2,3;
$$;
revoke all on function public.vtg_verified_network_directory(text) from public;
grant execute on function public.vtg_verified_network_directory(text) to authenticated;