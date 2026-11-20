-- VTG trade chain, connected end to end:
--   supplier records a shipment / uploads an order document -> buyer and the assigned bank see it (and are notified)
--   bank records an LC review outcome -> buyer AND supplier are notified and can read the review history.
--
-- * public.vtg_supplier_save_shipment(...)     supplier-only; writes public.shipments (+ a shipment_events row).
-- * public.vtg_supplier_add_order_document(...) supplier-only; writes public.trade_documents for the supplier's own order.
-- * Storage: suppliers may upload to vtg-trade-documents under their own user-id folder; order participants may read.
-- * trade_documents: order participants (buyer + supplier) may read the order's documents.
-- * vtg_bank_lc_review_events: suppliers may read the review history of LCs on their own orders.
-- * The review notification trigger now notifies the supplier as well as the buyer.
-- No money moves and no LC is issued here. Needs 20261106123000 and 20261119060000 first. Safe to re-run.

-- ---------- shipments ----------
create or replace function public.vtg_supplier_save_shipment(
  p_order_id uuid,
  p_shipment_id uuid default null,
  p_carrier text default null,
  p_tracking_number text default null,
  p_container_number text default null,
  p_origin_port text default null,
  p_destination_port text default null,
  p_current_location text default null,
  p_estimated_arrival timestamptz default null,
  p_status text default 'booked',
  p_progress_percent integer default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  o record; v_id uuid; v_status text := lower(btrim(coalesce(p_status, 'booked')));
  v_progress integer; v_label text; v_ref text; r record;
begin
  if v_uid is null or not exists (
    select 1 from public.profiles p
     where p.id = v_uid and p.role = 'supplier'::public.vtg_account_role and p.is_active = true and p.account_environment = 'trade'
  ) then
    raise exception 'An active supplier trade account is required' using errcode = '42501';
  end if;
  select * into o from public.trade_orders where id = p_order_id and supplier_id = v_uid;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;
  if o.status::text not in ('confirmed','processing','in_production','shipped','in_transit','arrived','customs','delivered') then
    raise exception 'The order must be confirmed before a shipment can be recorded' using errcode = '22023';
  end if;
  if v_status not in ('booked','departed','in_transit','arrived','customs','delivered') then
    raise exception 'Unknown shipment status' using errcode = '22023';
  end if;
  v_progress := coalesce(p_progress_percent, case v_status
      when 'booked' then 5 when 'departed' then 20 when 'in_transit' then 55 when 'arrived' then 85
      when 'customs' then 92 else 100 end);
  v_progress := greatest(0, least(100, v_progress));
  v_ref := coalesce(o.reference, 'order');

  if p_shipment_id is null then
    insert into public.shipments (order_id, carrier, tracking_number, container_number, origin_port, destination_port,
                                  current_location, estimated_arrival, progress_percent, status)
    values (o.id, left(p_carrier, 120), left(p_tracking_number, 120), left(p_container_number, 60),
            coalesce(left(p_origin_port, 120), o.origin_port), coalesce(left(p_destination_port, 120), o.destination_port),
            left(p_current_location, 160), p_estimated_arrival, v_progress, v_status)
    returning id into v_id;
  else
    update public.shipments s
       set carrier = coalesce(left(p_carrier, 120), s.carrier),
           tracking_number = coalesce(left(p_tracking_number, 120), s.tracking_number),
           container_number = coalesce(left(p_container_number, 60), s.container_number),
           origin_port = coalesce(left(p_origin_port, 120), s.origin_port),
           destination_port = coalesce(left(p_destination_port, 120), s.destination_port),
           current_location = coalesce(left(p_current_location, 160), s.current_location),
           estimated_arrival = coalesce(p_estimated_arrival, s.estimated_arrival),
           progress_percent = v_progress, status = v_status
     where s.id = p_shipment_id and s.order_id = o.id
    returning s.id into v_id;
    if v_id is null then raise exception 'Shipment not found on this order' using errcode = 'P0002'; end if;
  end if;

  v_label := case v_status when 'booked' then 'Shipment booked' when 'departed' then 'Shipment departed'
               when 'in_transit' then 'Shipment in transit' when 'arrived' then 'Shipment arrived at port'
               when 'customs' then 'Shipment in customs' else 'Shipment delivered' end;
  insert into public.shipment_events (shipment_id, event_type, description, location, event_time, created_by)
  values (v_id, v_status, coalesce(nullif(btrim(left(p_note, 400)), ''), v_label),
          left(coalesce(p_current_location, p_origin_port), 160), now(), v_uid);

  -- the order moves to shipped once goods leave (text compare: works on every environment's enum)
  if v_status in ('departed','in_transit') and o.status::text in ('confirmed','processing','in_production') then
    update public.trade_orders set status = 'shipped', updated_at = now() where id = o.id;
  end if;

  insert into public.vtg_notifications (user_id, title, body, notification_type, entity_type, entity_id)
  values (o.buyer_id, v_label || ' · ' || v_ref, left(coalesce(p_note, ''), 300), 'shipment_update', 'shipment', v_id::text);
  for r in select distinct lc.bank_id from public.letters_of_credit lc where lc.order_id = o.id and lc.bank_id is not null loop
    insert into public.vtg_notifications (user_id, title, body, notification_type, entity_type, entity_id)
    values (r.bank_id, v_label || ' · ' || v_ref, left(coalesce(p_note, ''), 300), 'shipment_update', 'shipment', v_id::text);
  end loop;
  return v_id;
end;
$$;
revoke all on function public.vtg_supplier_save_shipment(uuid, uuid, text, text, text, text, text, text, timestamptz, text, integer, text) from public, anon;
grant execute on function public.vtg_supplier_save_shipment(uuid, uuid, text, text, text, text, text, text, timestamptz, text, integer, text) to authenticated;

-- ---------- supplier order documents ----------
drop policy if exists "suppliers upload own order document objects" on storage.objects;
create policy "suppliers upload own order document objects" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vtg-trade-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.profiles p where p.id = (select auth.uid())
                  and p.role = 'supplier'::public.vtg_account_role and p.is_active = true)
  );

drop policy if exists "order participants read order document objects" on storage.objects;
create policy "order participants read order document objects" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'vtg-trade-documents'
    and exists (
      select 1 from public.trade_documents d join public.trade_orders o on o.id = d.order_id
       where d.storage_path = objects.name
         and ((select auth.uid()) = o.buyer_id or (select auth.uid()) = o.supplier_id)
    )
  );

drop policy if exists "order participants read order documents" on public.trade_documents;
create policy "order participants read order documents" on public.trade_documents
  for select to authenticated
  using (exists (select 1 from public.trade_orders o where o.id = trade_documents.order_id
                   and ((select auth.uid()) = o.buyer_id or (select auth.uid()) = o.supplier_id)));

create or replace function public.vtg_supplier_add_order_document(
  p_order_id uuid, p_document_type text, p_storage_path text, p_file_name text,
  p_mime_type text default null, p_file_size_bytes bigint default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid(); o record; v_id uuid; v_ref text; r record;
begin
  if v_uid is null or not exists (
    select 1 from public.profiles p
     where p.id = v_uid and p.role = 'supplier'::public.vtg_account_role and p.is_active = true and p.account_environment = 'trade'
  ) then
    raise exception 'An active supplier trade account is required' using errcode = '42501';
  end if;
  select * into o from public.trade_orders where id = p_order_id and supplier_id = v_uid;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;
  if nullif(btrim(coalesce(p_document_type, '')), '') is null or nullif(btrim(coalesce(p_file_name, '')), '') is null then
    raise exception 'Document type and file name are required' using errcode = '22023';
  end if;
  if p_storage_path is null or split_part(p_storage_path, '/', 1) <> v_uid::text then
    raise exception 'The file must be stored in your own folder' using errcode = '42501';
  end if;
  if p_mime_type is not null and p_mime_type not in ('application/pdf','image/jpeg','image/png','image/webp') then
    raise exception 'Only PDF, JPEG, PNG or WEBP files are accepted' using errcode = '22023';
  end if;
  if p_file_size_bytes is not null and (p_file_size_bytes <= 0 or p_file_size_bytes > 10485760) then
    raise exception 'Files must be 10 MB or smaller' using errcode = '22023';
  end if;
  insert into public.trade_documents (owner_id, order_id, document_type, storage_path, file_name, mime_type, file_size_bytes)
  values (v_uid, o.id, left(btrim(p_document_type), 80), p_storage_path, left(btrim(p_file_name), 200), p_mime_type, p_file_size_bytes)
  returning id into v_id;
  v_ref := coalesce(o.reference, 'order');
  insert into public.vtg_notifications (user_id, title, body, notification_type, entity_type, entity_id)
  values (o.buyer_id, 'New document · ' || v_ref, left(btrim(p_document_type), 120), 'order_document', 'trade_document', v_id::text);
  for r in select distinct lc.bank_id from public.letters_of_credit lc where lc.order_id = o.id and lc.bank_id is not null loop
    insert into public.vtg_notifications (user_id, title, body, notification_type, entity_type, entity_id)
    values (r.bank_id, 'New document · ' || v_ref, left(btrim(p_document_type), 120), 'order_document', 'trade_document', v_id::text);
  end loop;
  return v_id;
end;
$$;
revoke all on function public.vtg_supplier_add_order_document(uuid, text, text, text, text, bigint) from public, anon;
grant execute on function public.vtg_supplier_add_order_document(uuid, text, text, text, text, bigint) to authenticated;

-- ---------- bank decision reaches the supplier too ----------
drop policy if exists "suppliers read review events of lcs on their orders" on public.vtg_bank_lc_review_events;
create policy "suppliers read review events of lcs on their orders" on public.vtg_bank_lc_review_events
  for select to authenticated
  using (exists (select 1 from public.letters_of_credit lc where lc.id = lc_id and lc.supplier_id = (select auth.uid())));

create or replace function public.vtg_notify_buyer_of_lc_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare lc record; label text; v_title text;
begin
  select buyer_id, supplier_id, reference into lc from public.letters_of_credit where id = new.lc_id;
  if lc.buyer_id is null and lc.supplier_id is null then return new; end if;
  label := case new.status
             when 'under_review' then 'is under review'
             when 'documents_requested' then 'needs more documents'
             else 'was declined' end;
  v_title := 'LC request ' || coalesce(lc.reference, '') || ' ' || label;
  if lc.buyer_id is not null then
    insert into public.vtg_notifications (user_id, title, body, notification_type, entity_type, entity_id)
    values (lc.buyer_id, v_title, left(coalesce(new.note, ''), 300), 'lc_review', 'letter_of_credit', new.lc_id::text);
  end if;
  if lc.supplier_id is not null and lc.supplier_id is distinct from lc.buyer_id then
    insert into public.vtg_notifications (user_id, title, body, notification_type, entity_type, entity_id)
    values (lc.supplier_id, v_title, left(coalesce(new.note, ''), 300), 'lc_review', 'letter_of_credit', new.lc_id::text);
  end if;
  return new;
end;
$$;
revoke all on function public.vtg_notify_buyer_of_lc_review() from public, anon, authenticated;
