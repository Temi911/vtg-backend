-- Keep buyer trade document uploads tied to an order owned by the active buyer.
-- Enforce the advertised file limit and supported file types at Storage as well as in the UI.

drop policy if exists "document owner inserts" on public.trade_documents;

create policy "active buyers insert own order documents"
on public.trade_documents
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and order_id is not null
  and exists (
    select 1
    from public.trade_orders o
    join public.profiles p on p.id = (select auth.uid())
    where o.id = trade_documents.order_id
      and o.buyer_id = (select auth.uid())
      and p.role = 'buyer'::public.vtg_account_role
      and p.is_active = true
  )
);

update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf','image/jpeg','image/png','image/webp']::text[]
where id = 'vtg-trade-documents';
