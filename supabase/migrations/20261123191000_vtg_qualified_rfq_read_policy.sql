drop policy if exists "buyers and qualified suppliers read published RFQs" on public.buyer_trade_requests;
create policy "buyers and qualified suppliers read published RFQs"
on public.buyer_trade_requests for select to authenticated
using (
  buyer_id=(select auth.uid())
  or (
    buyer_trade_requests.status in ('open','quoted')
    and exists (
      select 1
      from public.profiles p
      join public.supplier_profiles sp on sp.user_id=p.id
      join public.products pr on pr.supplier_id=p.id
      where p.id=(select auth.uid())
        and p.role='supplier'::public.vtg_account_role
        and p.is_active=true
        and p.account_environment='trade'
        and sp.verification_status='verified'::public.vtg_document_status
        and (sp.verification_expires_at is null or sp.verification_expires_at>now())
        and pr.is_active=true and pr.is_verified=true and pr.review_status='approved'
        and (buyer_trade_requests.category is null or lower(trim(pr.category))=lower(trim(buyer_trade_requests.category)))
        and (
          buyer_trade_requests.audience in ('open_market','both')
          or exists(select 1 from public.buyer_rfq_targets t where t.request_id=buyer_trade_requests.id and t.supplier_id=(select auth.uid()))
        )
    )
  )
);