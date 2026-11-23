-- Restrict RFQ attachment access to the RFQ owner and suppliers who are
-- actually eligible to see that RFQ. Object path: <buyer_id>/<request_id>/<file>.
drop policy if exists "trade parties read RFQ attachments" on storage.objects;
create policy "RFQ participants read eligible attachments"
on storage.objects for select to authenticated
using (
  bucket_id = 'vtg-rfq-attachments'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists (
    select 1 from public.buyer_trade_requests r
    where r.id = split_part(name, '/', 2)::uuid
      and r.buyer_id::text = split_part(name, '/', 1)
      and (
        r.buyer_id = (select auth.uid())
        or (
          r.status in ('open','quoted')
          and exists (
            select 1
            from public.profiles p
            join public.supplier_profiles sp on sp.user_id = p.id
            join public.products pr on pr.supplier_id = p.id
            where p.id = (select auth.uid())
              and p.role = 'supplier'::public.vtg_account_role
              and p.is_active = true
              and p.account_environment = 'trade'
              and sp.verification_status = 'verified'::public.vtg_document_status
              and (sp.verification_expires_at is null or sp.verification_expires_at > now())
              and pr.is_active = true and pr.is_verified = true and pr.review_status = 'approved'
              and (r.category is null or lower(trim(pr.category)) = lower(trim(r.category)))
              and (
                r.audience in ('open_market','both')
                or exists (select 1 from public.buyer_rfq_targets t where t.request_id = r.id and t.supplier_id = (select auth.uid()))
              )
          )
        )
      )
  )
);
drop policy if exists "buyers upload own RFQ attachments" on storage.objects;
create policy "buyers upload attachments to own RFQ"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'vtg-rfq-attachments'
  and split_part(name, '/', 1) = (select auth.uid())::text
  and split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists (
    select 1 from public.buyer_trade_requests r
    join public.profiles p on p.id = r.buyer_id
    where r.id = split_part(name, '/', 2)::uuid
      and r.buyer_id = (select auth.uid())
      and p.role = 'buyer'::public.vtg_account_role
      and p.is_active = true and p.account_environment = 'trade'
  )
);
drop policy if exists "buyers delete own RFQ attachments" on storage.objects;
create policy "buyers delete own RFQ attachments"
on storage.objects for delete to authenticated
using (
  bucket_id = 'vtg-rfq-attachments'
  and split_part(name, '/', 1) = (select auth.uid())::text
  and split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists (select 1 from public.buyer_trade_requests r where r.id = split_part(name, '/', 2)::uuid and r.buyer_id = (select auth.uid()))
);
