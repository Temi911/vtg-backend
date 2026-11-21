-- VTG administrator dashboard, live.
-- Every function below is staff-only: it raises 42501 unless private.vtg_is_admin() is true, runs SECURITY DEFINER
-- with a pinned search_path, and is not executable by anon. Nothing here moves money, issues an LC or edits
-- buyer, supplier or bank records; reviews go through the existing review functions.
--
-- * Server-side, append-only audit trail (public.audit_events): triggers record who changed a product review,
--   a verification document or a role request, with before/after values. Browser-local notes are replaced by
--   vtg_admin_record_note().
-- * vtg_admin_overview()            counts, weekly activity, recent audit events
-- * vtg_admin_trade_exceptions()    exceptions computed from real orders, LCs, shipments and documents
-- * vtg_admin_verification_queue()  pending verification documents + pending role requests
-- * vtg_admin_finance_overview()    payment records and computed reconciliation flags (read-only, no provider refs)
-- * vtg_admin_audit_list()          the audit trail
-- * vtg_admin_settings_snapshot()   staff and review-queue facts (read-only)
-- * Admins can open verification-document files (signed URLs) from storage.
-- Needs 20261106123000, 20261118090000 and 20261120090000. Safe to re-run.

-- ---------- audit table hygiene: RLS only, append-only ----------
alter table public.audit_events enable row level security;
revoke all on public.audit_events from anon, authenticated;
drop policy if exists "admins read audit events" on public.audit_events;
create policy "admins read audit events" on public.audit_events for select to authenticated using (private.vtg_is_admin());
grant select on public.audit_events to authenticated;
create index if not exists audit_events_created_idx on public.audit_events (created_at desc);
create index if not exists audit_events_type_idx on public.audit_events (event_type, created_at desc);

create or replace function private.vtg_audit_append_only()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'The audit trail is append-only' using errcode = '42501';
end;
$$;
drop trigger if exists vtg_audit_events_append_only on public.audit_events;
create trigger vtg_audit_events_append_only before update or delete on public.audit_events
  for each row execute function private.vtg_audit_append_only();

create or replace function private.vtg_admin_gate()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not private.vtg_is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
end;
$$;
revoke all on function private.vtg_admin_gate() from public, anon;
grant execute on function private.vtg_admin_gate() to authenticated;

create or replace function private.vtg_audit(p_event text, p_entity text, p_entity_id uuid, p_details jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_events (actor_id, event_type, entity_type, entity_id, details)
  values (auth.uid(), p_event, p_entity, p_entity_id, coalesce(p_details, '{}'::jsonb));
end;
$$;
revoke all on function private.vtg_audit(text, text, uuid, jsonb) from public, anon, authenticated;

-- ---------- triggers: record privileged review changes with before/after ----------
create or replace function private.vtg_audit_product_review()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.review_status is distinct from new.review_status and private.vtg_is_admin() then
    perform private.vtg_audit('product_review', 'product', new.id,
      jsonb_build_object('name', new.name, 'from', old.review_status, 'to', new.review_status, 'note', new.review_note, 'supplier_id', new.supplier_id));
  end if;
  return new;
end;
$$;
revoke all on function private.vtg_audit_product_review() from public, anon, authenticated;
drop trigger if exists vtg_audit_product_review on public.products;
create trigger vtg_audit_product_review after update of review_status on public.products
  for each row execute function private.vtg_audit_product_review();

create or replace function private.vtg_audit_verification_review()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status is distinct from new.status and private.vtg_is_admin() then
    perform private.vtg_audit('verification_document_review', 'verification_document', new.id,
      jsonb_build_object('doc_type', new.doc_type, 'account_role', new.account_role, 'from', old.status, 'to', new.status,
                         'notes', new.review_notes, 'subject_user_id', new.user_id));
  end if;
  return new;
end;
$$;
revoke all on function private.vtg_audit_verification_review() from public, anon, authenticated;
drop trigger if exists vtg_audit_verification_review on public.vtg_verification_documents;
create trigger vtg_audit_verification_review after update of status on public.vtg_verification_documents
  for each row execute function private.vtg_audit_verification_review();

create or replace function private.vtg_audit_role_request_review()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status is distinct from new.status and private.vtg_is_admin() then
    perform private.vtg_audit('role_request_review', 'role_request', new.id,
      jsonb_build_object('requested_role', new.requested_role::text, 'from', old.status, 'to', new.status,
                         'notes', new.reviewer_notes, 'subject_user_id', new.user_id));
  end if;
  return new;
end;
$$;
revoke all on function private.vtg_audit_role_request_review() from public, anon, authenticated;
drop trigger if exists vtg_audit_role_request_review on public.role_requests;
create trigger vtg_audit_role_request_review after update of status on public.role_requests
  for each row execute function private.vtg_audit_role_request_review();

-- ---------- admins may open verification files ----------
drop policy if exists "admins read verification objects" on storage.objects;
create policy "admins read verification objects" on storage.objects for select to authenticated
  using (bucket_id = 'vtg-verification-documents' and private.vtg_is_admin());

-- ---------- exceptions, computed from live records ----------
create or replace function private.vtg_admin_exception_rows()
returns table (reference text, stage text, corridor text, issue text, priority text, next_step text, entity_type text, entity_id uuid, rank int)
language sql stable security definer set search_path = '' as $$
  select lc.reference, 'Letter of credit', coalesce(o.origin_port,'—') || ' → ' || coalesce(o.destination_port,'—'),
         'LC request expires in ' || greatest(0, (lc.expiry_date - current_date)) || ' day(s)',
         case when lc.expiry_date - current_date <= 7 then 'High' else 'Medium' end,
         'Check with the bank and buyer before expiry', 'letter_of_credit', lc.id,
         case when lc.expiry_date - current_date <= 7 then 1 else 2 end
    from public.letters_of_credit lc join public.trade_orders o on o.id = lc.order_id
   where lc.status::text in ('requested','under_review','documents_requested')
     and lc.expiry_date is not null and lc.expiry_date >= current_date and lc.expiry_date - current_date <= 14
  union all
  select lc.reference, 'Letter of credit', coalesce(o.origin_port,'—') || ' → ' || coalesce(o.destination_port,'—'),
         'Bank has waited ' || extract(day from now() - lc.updated_at)::int || ' days for documents',
         'Medium', 'Remind the buyer or supplier to upload the requested documents', 'letter_of_credit', lc.id, 2
    from public.letters_of_credit lc join public.trade_orders o on o.id = lc.order_id
   where lc.status::text = 'documents_requested' and lc.updated_at < now() - interval '5 days'
  union all
  select lc.reference, 'Letter of credit', coalesce(o.origin_port,'—') || ' → ' || coalesce(o.destination_port,'—'),
         'Buyer KYC is not verified on an open LC request', 'High',
         'Review the buyer''s verification before the bank proceeds', 'letter_of_credit', lc.id, 1
    from public.letters_of_credit lc join public.trade_orders o on o.id = lc.order_id
    join public.buyer_profiles bp on bp.user_id = lc.buyer_id
   where lc.status::text in ('requested','under_review','documents_requested') and coalesce(bp.kyc_status::text,'') <> 'verified'
  union all
  select coalesce(o.reference, 'Order'), 'Order readiness', coalesce(o.origin_port,'—') || ' → ' || coalesce(o.destination_port,'—'),
         'No shipment recorded ' || extract(day from now() - o.created_at)::int || ' days after the order',
         'Medium', 'Ask the supplier for a shipment update', 'order', o.id, 2
    from public.trade_orders o
   where o.status::text in ('confirmed','processing','in_production') and o.created_at < now() - interval '14 days'
     and not exists (select 1 from public.shipments s where s.order_id = o.id)
  union all
  select coalesce(o.reference, 'Order'), 'Shipment', coalesce(s.origin_port,'—') || ' → ' || coalesce(s.destination_port,'—'),
         'Estimated arrival passed ' || extract(day from now() - s.estimated_arrival)::int || ' day(s) ago',
         'High', 'Confirm the carrier update with the supplier', 'shipment', s.id, 1
    from public.shipments s join public.trade_orders o on o.id = s.order_id
   where s.estimated_arrival < now() and coalesce(s.status::text,'') not in ('arrived','customs','delivered')
  union all
  select coalesce(o.reference, 'Order'), 'Documents', '—',
         d.document_type || ' waiting for review for ' || extract(day from now() - d.created_at)::int || ' days',
         'Medium', 'Request a document check', 'trade_document', d.id, 2
    from public.trade_documents d left join public.trade_orders o on o.id = d.order_id
   where d.status::text = 'pending' and d.created_at < now() - interval '3 days';
$$;
revoke all on function private.vtg_admin_exception_rows() from public, anon, authenticated;

create or replace function public.vtg_admin_trade_exceptions()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.vtg_admin_gate();
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.rank, x.reference) from (
    select reference, stage, corridor, issue, priority, next_step, entity_type, entity_id, rank
      from private.vtg_admin_exception_rows() limit 300) x), '[]'::jsonb);
end;
$$;
revoke all on function public.vtg_admin_trade_exceptions() from public, anon;
grant execute on function public.vtg_admin_trade_exceptions() to authenticated;

-- ---------- overview ----------
create or replace function public.vtg_admin_overview()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r jsonb;
begin
  perform private.vtg_admin_gate();
  select jsonb_build_object(
    'generated_at', now(),
    'accounts', coalesce((select jsonb_object_agg(role, n) from (select role::text role, count(*) n from public.profiles where is_active group by role) a), '{}'::jsonb),
    'queues', jsonb_build_object(
      'products_pending', (select count(*) from public.products where review_status = 'pending'),
      'verification_documents_pending', (select count(*) from public.vtg_verification_documents where status::text = 'pending'),
      'role_requests_pending', (select count(*) from public.role_requests where status::text = 'pending'),
      'lc_new', (select count(*) from public.letters_of_credit where status::text = 'requested'),
      'trade_documents_pending', (select count(*) from public.trade_documents where status::text = 'pending'),
      'exceptions', (select count(*) from private.vtg_admin_exception_rows()),
      'high_priority', (select count(*) from private.vtg_admin_exception_rows() where priority = 'High')),
    'orders_by_status', coalesce((select jsonb_object_agg(s, n) from (select status::text s, count(*) n from public.trade_orders group by 1) o), '{}'::jsonb),
    'lcs_by_status', coalesce((select jsonb_object_agg(s, n) from (select status::text s, count(*) n from public.letters_of_credit group by 1) l), '{}'::jsonb),
    'shipments_active', (select count(*) from public.shipments where coalesce(status::text,'') not in ('arrived','customs','delivered')),
    'workforce', jsonb_build_object(
      'active_members', (select count(*) from public.vtg_workforce_members where status::text = 'active'),
      'pending_invitations', (select count(*) from public.vtg_workforce_invitations where status::text = 'pending')),
    'weekly', coalesce((select jsonb_agg(jsonb_build_object(
        'day', to_char(d, 'Dy'), 'date', d::date,
        'orders', (select count(*) from public.trade_orders where created_at::date = d::date),
        'lc_requests', (select count(*) from public.letters_of_credit where created_at::date = d::date),
        'documents', (select count(*) from public.trade_documents where created_at::date = d::date),
        'shipment_events', (select count(*) from public.shipment_events where created_at::date = d::date),
        'admin_actions', (select count(*) from public.audit_events where created_at::date = d::date)) order by d)
      from generate_series(current_date - 6, current_date, interval '1 day') d), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at desc) from (
        select a.id, a.event_type, a.entity_type, a.entity_id, a.created_at, coalesce(p.full_name, p.email, 'Staff') as actor, a.details
          from public.audit_events a left join public.profiles p on p.id = a.actor_id
         order by a.created_at desc limit 12) e), '[]'::jsonb)
  ) into r;
  return r;
end;
$$;
revoke all on function public.vtg_admin_overview() from public, anon;
grant execute on function public.vtg_admin_overview() to authenticated;

-- ---------- verification queue ----------
create or replace function public.vtg_admin_verification_queue()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.vtg_admin_gate();
  return jsonb_build_object(
    'documents', coalesce((select jsonb_agg(to_jsonb(x) order by x.uploaded_at) from (
        select d.id, d.user_id, coalesce(p.full_name, p.email) as submitted_by, p.email, d.account_role, d.doc_type, d.file_name,
               d.mime_type, d.file_size_bytes, d.storage_path, d.status, d.uploaded_at, d.expires_at
          from public.vtg_verification_documents d left join public.profiles p on p.id = d.user_id
         where d.status::text = 'pending' order by d.uploaded_at limit 200) x), '[]'::jsonb),
    'role_requests', coalesce((select jsonb_agg(to_jsonb(y) order by y.created_at) from (
        select rr.id, rr.user_id, coalesce(p.full_name, p.email) as submitted_by, rr.requested_role::text as requested_role,
               rr.organization_name, rr.country, rr.registration_reference, rr.created_at
          from public.role_requests rr left join public.profiles p on p.id = rr.user_id
         where rr.status::text = 'pending' order by rr.created_at limit 100) y), '[]'::jsonb));
end;
$$;
revoke all on function public.vtg_admin_verification_queue() from public, anon;
grant execute on function public.vtg_admin_verification_queue() to authenticated;

-- ---------- finance oversight: read-only ----------
create or replace function public.vtg_admin_finance_overview()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.vtg_admin_gate();
  return jsonb_build_object(
    'generated_at', now(),
    'by_status', coalesce((select jsonb_agg(to_jsonb(s)) from (
        select status::text as status, currency, count(*) as records, coalesce(sum(amount), 0) as total
          from public.vtg_payment_intents group by status, currency order by status, currency) s), '[]'::jsonb),
    'flags', coalesce((select jsonb_agg(to_jsonb(f) order by f.age_days desc) from (
        select pi.id, coalesce(o.reference, 'No order') as order_reference, pi.purpose, pi.amount, pi.currency, pi.status::text as status,
               extract(day from now() - pi.created_at)::int as age_days,
               case when pi.order_id is null then 'Payment record has no linked order'
                    when pi.status::text in ('failed','cancelled','canceled') then 'Payment ' || pi.status::text
                    else 'Pending for more than 3 days' end as issue
          from public.vtg_payment_intents pi left join public.trade_orders o on o.id = pi.order_id
         where pi.order_id is null or pi.status::text in ('failed','cancelled','canceled')
            or (pi.status::text in ('pending','requires_action','created') and pi.created_at < now() - interval '3 days')
         order by pi.created_at limit 100) f), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from (
        select pi.id, coalesce(o.reference, 'No order') as order_reference, pi.purpose, pi.amount, pi.currency, pi.status::text as status, pi.provider, pi.created_at
          from public.vtg_payment_intents pi left join public.trade_orders o on o.id = pi.order_id
         order by pi.created_at desc limit 50) r), '[]'::jsonb),
    'notice', 'Read-only. VTG does not move money, approve payouts or release commissions from this dashboard.');
end;
$$;
revoke all on function public.vtg_admin_finance_overview() from public, anon;
grant execute on function public.vtg_admin_finance_overview() to authenticated;

-- ---------- audit trail + notes ----------
create or replace function public.vtg_admin_audit_list(p_limit integer default 100, p_search text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_limit integer := greatest(1, least(coalesce(p_limit, 100), 500)); v_q text := nullif(btrim(coalesce(p_search, '')), '');
begin
  perform private.vtg_admin_gate();
  return coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at desc) from (
    select a.id, a.created_at, a.event_type, a.entity_type, a.entity_id, a.details,
           coalesce(p.full_name, p.email, 'Staff') as actor
      from public.audit_events a left join public.profiles p on p.id = a.actor_id
     where v_q is null or a.event_type ilike '%' || v_q || '%' or a.entity_type ilike '%' || v_q || '%'
        or a.details::text ilike '%' || v_q || '%' or coalesce(p.full_name, p.email, '') ilike '%' || v_q || '%'
     order by a.created_at desc limit v_limit) e), '[]'::jsonb);
end;
$$;
revoke all on function public.vtg_admin_audit_list(integer, text) from public, anon;
grant execute on function public.vtg_admin_audit_list(integer, text) to authenticated;

create or replace function public.vtg_admin_record_note(p_reference text, p_kind text, p_note text, p_entity_id uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  perform private.vtg_admin_gate();
  if v_note is null then raise exception 'A note is required' using errcode = '22023'; end if;
  perform private.vtg_audit('admin_note', left(coalesce(nullif(btrim(p_kind), ''), 'general'), 60), p_entity_id,
    jsonb_build_object('reference', left(coalesce(p_reference, ''), 120), 'note', left(v_note, 2000)));
end;
$$;
revoke all on function public.vtg_admin_record_note(text, text, text, uuid) from public, anon;
grant execute on function public.vtg_admin_record_note(text, text, text, uuid) to authenticated;

-- ---------- settings snapshot: read-only facts ----------
create or replace function public.vtg_admin_settings_snapshot()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.vtg_admin_gate();
  return jsonb_build_object(
    'generated_at', now(),
    'administrators', (select count(*) from public.profiles where role = 'admin'::public.vtg_account_role and is_active),
    'workforce_by_role', coalesce((select jsonb_agg(to_jsonb(w)) from (
        select workspace_role, status, count(*) as members from public.vtg_workforce_members group by 1, 2 order by 1, 2) w), '[]'::jsonb),
    'invitations_by_status', coalesce((select jsonb_object_agg(status::text, n) from (select status, count(*) n from public.vtg_workforce_invitations group by 1) i), '{}'::jsonb),
    'products_by_review', coalesce((select jsonb_object_agg(review_status, n) from (select review_status, count(*) n from public.products group by 1) p), '{}'::jsonb),
    'verification_by_status', coalesce((select jsonb_object_agg(status::text, n) from (select status, count(*) n from public.vtg_verification_documents group by 1) v), '{}'::jsonb),
    'role_requests_by_status', coalesce((select jsonb_object_agg(status::text, n) from (select status, count(*) n from public.role_requests group by 1) rr), '{}'::jsonb),
    'audit_events_total', (select count(*) from public.audit_events));
end;
$$;
revoke all on function public.vtg_admin_settings_snapshot() from public, anon;
grant execute on function public.vtg_admin_settings_snapshot() to authenticated;
