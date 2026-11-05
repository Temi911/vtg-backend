drop policy if exists "active buyers create own network connection requests" on public.vtg_network_connection_requests;
create policy "active buyers create own network connection requests" on public.vtg_network_connection_requests
for insert to authenticated with check (
 buyer_id=(select auth.uid()) and partner_id<>(select auth.uid())
 and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='buyer'::public.vtg_account_role and p.is_active=true)
 and (
  (partner_type='supplier' and exists(select 1 from public.profiles pp join public.supplier_profiles sp on sp.user_id=pp.id where pp.id=partner_id and pp.role='supplier'::public.vtg_account_role and pp.is_active=true and sp.verification_status='verified'::public.vtg_document_status))
  or (partner_type='bank' and exists(select 1 from public.profiles pp join public.bank_profiles bp on bp.user_id=pp.id where pp.id=partner_id and pp.role='bank'::public.vtg_account_role and pp.is_active=true and bp.verification_status='verified'::public.vtg_document_status))
  or (partner_type='agent' and exists(select 1 from public.profiles pp join public.agent_profiles ap on ap.user_id=pp.id where pp.id=partner_id and pp.role='agent'::public.vtg_account_role and pp.is_active=true and ap.verification_status='verified'::public.vtg_document_status))
 )
);