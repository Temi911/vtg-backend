-- VTG bank workspace, live end to end:
--   buyer sends an LC request draft to a verified bank -> bank sees it, reviews it (with an audit trail)
--   -> buyer is notified and can read the outcome.
--
-- * public.vtg_buyer_submit_lc_request(draft, bank): buyer-only; turns one of the buyer's own drafts (for an order that
--   is confirmed or later) into an assigned letters_of_credit row for a VERIFIED bank. One draft can be sent once.
-- * public.vtg_bank_workspace_overview(): one read for a verified bank: assigned cases with safe party names, linked
--   order, documents, shipments (+events), payment intents (reference only) and the review history. No emails/phones.
-- * Banks can change only status/updated_at on their assigned LCs (column grant + existing guard trigger).
-- * Review events notify the buyer, and the buyer can read the review history of their own LCs.
-- This workspace never issues an LC and never moves money; statuses are review outcomes only.
-- Safe to re-run.

alter table public.letters_of_credit
  add column if not exists source_draft_id uuid references public.buyer_lc_request_drafts(id) on delete set null;

create unique index if not exists letters_of_credit_source_draft_uidx
  on public.letters_of_credit (source_draft_id) where source_draft_id is not null;
create unique index if not exists letters_of_credit_reference_uidx
  on public.letters_of_credit (reference) where reference is not null;
create index if not exists letters_of_credit_bank_status_idx
  on public.letters_of_credit (bank_id, status, created_at desc);
create index if not exists letters_of_credit_order_idx on public.letters_of_credit (order_id);

-- the only columns a bank may update (the guard trigger and RLS policy still apply)
revoke update on public.letters_of_credit from authenticated;
grant update (status, updated_at) on public.letters_of_credit to authenticated;

-- buyers can read the review history of their own LCs
drop policy if exists "buyers read review events of their own lcs" on public.vtg_bank_lc_review_events;
create policy "buyers read review events of their own lcs" on public.vtg_bank_lc_review_events
  for select to authenticated
  using (exists (select 1 from public.letters_of_credit lc where lc.id = lc_id and lc.buyer_id = (select auth.uid())));

-- notify the buyer when the bank records a review
create or replace function public.vtg_notify_buyer_of_lc_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare lc record; label text;
begin
  select buyer_id, reference into lc from public.letters_of_credit where id = new.lc_id;
  if lc.buyer_id is null then return new; end if;
  label := case new.status
             when 'under_review' then 'is under review'
             when 'documents_requested' then 'needs more documents'
             else 'was declined' end;
  insert into public.vtg_notifications (user_id, title, body, notification_type, entity_type, entity_id)
  values (lc.buyer_id, 'LC request ' || coalesce(lc.reference, '') || ' ' || label,
          left(coalesce(new.note, ''), 300), 'lc_review', 'letter_of_credit', new.lc_id::text);
  return new;
end;
$$;
revoke all on function public.vtg_notify_buyer_of_lc_review() from public, anon, authenticated;

drop trigger if exists vtg_notify_buyer_of_lc_review on public.vtg_bank_lc_review_events;
create trigger vtg_notify_buyer_of_lc_review
  after insert on public.vtg_bank_lc_review_events
  for each row execute function public.vtg_notify_buyer_of_lc_review();

-- buyer sends a draft to a verified bank
create or replace function public.vtg_buyer_submit_lc_request(p_draft_id uuid, p_bank_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  d record; o record; v_bank text; v_id uuid; v_ref text;
begin
  if v_uid is null or not exists (
    select 1 from public.profiles p
     where p.id = v_uid and p.role = 'buyer'::public.vtg_account_role and p.is_active = true and p.account_environment = 'trade'
  ) then
    raise exception 'An active buyer trade account is required' using errcode = '42501';
  end if;
  select * into d from public.buyer_lc_request_drafts where id = p_draft_id and buyer_id = v_uid;
  if not found then raise exception 'LC request draft not found' using errcode = 'P0002'; end if;
  select * into o from public.trade_orders where id = d.order_id and buyer_id = v_uid;
  if not found or o.status::text not in ('confirmed','processing','in_production','shipped','in_transit','arrived','customs','delivered') then
    raise exception 'The linked order must be confirmed before an LC request can go to a bank' using errcode = '22023';
  end if;
  select coalesce(nullif(b.bank_name, ''), 'Verified bank') into v_bank
    from public.bank_profiles b join public.profiles p on p.id = b.user_id
   where b.user_id = p_bank_id and b.verification_status = 'verified'::public.vtg_document_status
     and p.role = 'bank'::public.vtg_account_role and p.is_active = true and p.account_environment = 'trade';
  if not found then raise exception 'Choose a verified bank' using errcode = '22023'; end if;
  if exists (select 1 from public.letters_of_credit where source_draft_id = p_draft_id) then
    raise exception 'This draft has already been sent to a bank' using errcode = '23505';
  end if;
  v_ref := 'LC-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
  insert into public.letters_of_credit (order_id, buyer_id, supplier_id, bank_id, reference, amount, currency, status, expiry_date, source_draft_id)
  values (o.id, v_uid, o.supplier_id, p_bank_id, v_ref, d.requested_amount, d.currency, 'requested', d.expiry_date, d.id)
  returning id into v_id;
  insert into public.vtg_notifications (user_id, title, body, notification_type, entity_type, entity_id)
  values (p_bank_id, 'New LC request ' || v_ref,
          d.currency || ' ' || d.requested_amount::text || ' for order ' || coalesce(o.reference, ''), 'lc_request', 'letter_of_credit', v_id::text);
  return v_id;
end;
$$;
revoke all on function public.vtg_buyer_submit_lc_request(uuid, uuid) from public, anon;
grant execute on function public.vtg_buyer_submit_lc_request(uuid, uuid) to authenticated;

-- verified bank: everything assigned to it, in one read
create or replace function public.vtg_bank_workspace_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_bank jsonb; v_cases jsonb; v_docs jsonb; v_ships jsonb; v_events jsonb; v_pay jsonb; v_reviews jsonb;
begin
  select to_jsonb(x) into v_bank from (
    select b.bank_name, b.branch_name, b.swift_code, b.officer_name, b.officer_title,
           b.verification_status::text as verification_status, b.verified_at, pr.preferred_language
      from public.bank_profiles b join public.profiles pr on pr.id = b.user_id
     where b.user_id = v_uid and b.verification_status = 'verified'::public.vtg_document_status
       and pr.role = 'bank'::public.vtg_account_role and pr.is_active = true and pr.account_environment = 'trade'
  ) x;
  if v_uid is null or v_bank is null then
    raise exception 'An active verified bank trade account is required' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(c order by (c->>'created_at') desc), '[]'::jsonb) into v_cases from (
    select to_jsonb(q) as c from (
      select lc.id, lc.reference, lc.amount, lc.currency, lc.status, lc.expiry_date, lc.created_at, lc.updated_at, lc.order_id,
             o.reference as order_reference, o.status::text as order_status, o.quantity, o.unit_price,
             o.currency as order_currency, o.incoterm, o.origin_port, o.destination_port,
             coalesce(nullif(bp.company_name, ''), pb.full_name) as buyer_name, pb.country as buyer_country,
             bp.kyc_status::text as buyer_kyc,
             coalesce(nullif(sp.company_name, ''), ps.full_name) as supplier_name,
             coalesce(sp.country, ps.country) as supplier_country, sp.verification_status::text as supplier_verification,
             d.beneficiary_name, d.preferred_lc_type, d.goods_summary, d.latest_shipment_date, d.supporting_notes
        from public.letters_of_credit lc
        join public.trade_orders o on o.id = lc.order_id
        left join public.profiles pb on pb.id = lc.buyer_id
        left join public.buyer_profiles bp on bp.user_id = lc.buyer_id
        left join public.profiles ps on ps.id = lc.supplier_id
        left join public.supplier_profiles sp on sp.user_id = lc.supplier_id
        left join public.buyer_lc_request_drafts d on d.id = lc.source_draft_id
       where lc.bank_id = v_uid
       order by lc.created_at desc limit 200
    ) q
  ) s;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb) into v_docs from (
    select td.id, td.order_id, td.document_type, td.file_name, td.mime_type, td.file_size_bytes, td.status::text as status,
           td.review_notes, td.storage_path, td.created_at
      from public.trade_documents td
     where td.order_id in (select order_id from public.letters_of_credit where bank_id = v_uid)
     order by td.created_at desc limit 300
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb) into v_ships from (
    select s.id, s.order_id, s.carrier, s.tracking_number, s.container_number, s.origin_port, s.destination_port,
           s.current_location, s.estimated_arrival, s.progress_percent, s.status, s.created_at
      from public.shipments s
     where s.order_id in (select order_id from public.letters_of_credit where bank_id = v_uid)
     order by s.created_at desc limit 200
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.event_time desc), '[]'::jsonb) into v_events from (
    select e.id, e.shipment_id, e.event_type, e.description, e.location, e.event_time
      from public.shipment_events e
     where e.shipment_id in (
       select s.id from public.shipments s
        where s.order_id in (select order_id from public.letters_of_credit where bank_id = v_uid))
     order by e.event_time desc limit 400
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb) into v_pay from (
    select pi.id, pi.order_id, pi.amount, pi.currency, pi.purpose, pi.status, pi.provider, pi.created_at
      from public.vtg_payment_intents pi
     where pi.order_id in (select order_id from public.letters_of_credit where bank_id = v_uid)
     order by pi.created_at desc limit 200
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb) into v_reviews from (
    select r.id, r.lc_id, r.status, r.note, r.created_at
      from public.vtg_bank_lc_review_events r where r.bank_id = v_uid
     order by r.created_at desc limit 500
  ) x;

  return jsonb_build_object(
    'bank', v_bank, 'cases', v_cases, 'documents', v_docs, 'shipments', v_ships, 'shipment_events', v_events,
    'payment_intents', v_pay, 'review_events', v_reviews, 'generated_at', now(),
    'notice', 'Assigned trade view. Review outcomes are audit-recorded. This workspace does not issue LCs or execute or release payments.');
end;
$$;
revoke all on function public.vtg_bank_workspace_overview() from public, anon;
grant execute on function public.vtg_bank_workspace_overview() to authenticated;
