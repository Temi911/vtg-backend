-- Native VTG trade operations, payment-intent and inspection foundations.
create table if not exists public.trade_quotes (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.trade_orders(id) on delete cascade,
 buyer_id uuid not null references public.profiles(id),
 supplier_id uuid not null references public.profiles(id),
 product_id uuid references public.products(id),
 quantity numeric(18,3) not null check(quantity>0),
 unit_price numeric(18,4) check(unit_price is null or unit_price>=0),
 currency text not null default 'USD' check(currency in ('USD','NGN','CNY','KRW')),
 incoterm text, delivery_days integer check(delivery_days is null or delivery_days>=0),
 status text not null default 'requested' check(status in ('requested','quoted','accepted','declined','cancelled','expired')),
 buyer_message text, supplier_message text, valid_until timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists trade_quotes_buyer_created_idx on public.trade_quotes(buyer_id,created_at desc);
create index if not exists trade_quotes_supplier_created_idx on public.trade_quotes(supplier_id,created_at desc);
create index if not exists trade_quotes_order_idx on public.trade_quotes(order_id);
create index if not exists trade_quotes_product_idx on public.trade_quotes(product_id);
alter table public.trade_quotes enable row level security;
drop policy if exists "Trade participants read quotes" on public.trade_quotes;
create policy "Trade participants read quotes" on public.trade_quotes for select to authenticated
using (buyer_id=(select auth.uid()) or supplier_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and p.is_active));
drop policy if exists "Buyers request quotes" on public.trade_quotes;
create policy "Buyers request quotes" on public.trade_quotes for insert to authenticated
with check (buyer_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='buyer' and p.is_active)
 and exists(select 1 from public.trade_orders o where o.id=trade_quotes.order_id and o.buyer_id=(select auth.uid()) and o.supplier_id=trade_quotes.supplier_id and o.product_id=trade_quotes.product_id and o.status <> 'cancelled'));
drop policy if exists "Suppliers respond to quotes" on public.trade_quotes;
create policy "Suppliers respond to quotes" on public.trade_quotes for update to authenticated
using (supplier_id=(select auth.uid()) and status='requested')
with check (supplier_id=(select auth.uid()) and status in ('quoted','declined'));
revoke update on public.trade_quotes from authenticated;
grant select,insert on public.trade_quotes to authenticated;
grant update(unit_price,currency,incoterm,delivery_days,status,supplier_message,valid_until,updated_at) on public.trade_quotes to authenticated;

create table if not exists public.shipment_events (
 id uuid primary key default gen_random_uuid(), shipment_id uuid not null references public.shipments(id) on delete cascade,
 event_type text not null, description text not null, location text, event_time timestamptz not null default now(),
 created_by uuid references public.profiles(id), created_at timestamptz not null default now()
);
create index if not exists shipment_events_shipment_time_idx on public.shipment_events(shipment_id,event_time desc);
create index if not exists shipment_events_created_by_idx on public.shipment_events(created_by);
alter table public.shipment_events enable row level security;
drop policy if exists "Trade participants read shipment events" on public.shipment_events;
create policy "Trade participants read shipment events" on public.shipment_events for select to authenticated
using (exists(select 1 from public.shipments s join public.trade_orders o on o.id=s.order_id where s.id=shipment_id and (o.buyer_id=(select auth.uid()) or o.supplier_id=(select auth.uid())))
 or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and p.is_active));
drop policy if exists "Suppliers and admins append shipment events" on public.shipment_events;
create policy "Suppliers and admins append shipment events" on public.shipment_events for insert to authenticated
with check (created_by=(select auth.uid()) and exists(select 1 from public.shipments s join public.trade_orders o on o.id=s.order_id
 where s.id=shipment_id and (o.supplier_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and p.is_active))));
grant select,insert on public.shipment_events to authenticated;

create table if not exists public.vtg_payment_intents (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.trade_orders(id),
 payer_id uuid not null references public.profiles(id), payee_id uuid not null references public.profiles(id),
 amount numeric(18,2) not null check(amount>0), currency text not null check(currency in ('USD','NGN','CNY','KRW')),
 purpose text not null check(purpose in ('order_deposit','order_balance','inspection','logistics','other')),
 status text not null default 'created' check(status in ('created','pending_provider','authorized','succeeded','failed','cancelled','refunded')),
 provider text, provider_reference text, idempotency_key text not null, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(payer_id,idempotency_key)
);
create index if not exists vtg_payment_order_idx on public.vtg_payment_intents(order_id,created_at desc);
create index if not exists vtg_payment_payee_idx on public.vtg_payment_intents(payee_id,created_at desc);
alter table public.vtg_payment_intents enable row level security;
drop policy if exists "Trade parties read payment intents" on public.vtg_payment_intents;
create policy "Trade parties read payment intents" on public.vtg_payment_intents for select to authenticated
using (payer_id=(select auth.uid()) or payee_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and p.is_active));
drop policy if exists "Buyer creates payment intent" on public.vtg_payment_intents;
create policy "Buyer creates payment intent" on public.vtg_payment_intents for insert to authenticated
with check (payer_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='buyer' and p.is_active)
 and exists(select 1 from public.trade_orders o where o.id=order_id and o.buyer_id=(select auth.uid()) and o.supplier_id=payee_id));
grant select,insert on public.vtg_payment_intents to authenticated;

create table if not exists public.vtg_inspection_requests (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.trade_orders(id),
 requested_by uuid not null references public.profiles(id), supplier_id uuid not null references public.profiles(id),
 inspection_type text not null, requested_date date, location text, scope text,
 status text not null default 'requested' check(status in ('requested','accepted','scheduled','in_progress','completed','rejected','cancelled')),
 inspector_id uuid references public.profiles(id), findings text, completed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists vtg_inspection_order_idx on public.vtg_inspection_requests(order_id,created_at desc);
create index if not exists vtg_inspection_inspector_idx on public.vtg_inspection_requests(inspector_id,status);
create index if not exists vtg_inspection_requests_requested_by_idx on public.vtg_inspection_requests(requested_by);
create index if not exists vtg_inspection_requests_supplier_idx on public.vtg_inspection_requests(supplier_id);
alter table public.vtg_inspection_requests enable row level security;
drop policy if exists "Trade parties read inspection requests" on public.vtg_inspection_requests;
create policy "Trade parties read inspection requests" on public.vtg_inspection_requests for select to authenticated
using (requested_by=(select auth.uid()) or supplier_id=(select auth.uid()) or inspector_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and p.is_active));
drop policy if exists "Buyer requests inspection" on public.vtg_inspection_requests;
create policy "Buyer requests inspection" on public.vtg_inspection_requests for insert to authenticated
with check (requested_by=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='buyer' and p.is_active)
 and exists(select 1 from public.trade_orders o where o.id=order_id and o.buyer_id=(select auth.uid()) and o.supplier_id=supplier_id));
grant select,insert on public.vtg_inspection_requests to authenticated;

create table if not exists public.vtg_inspection_evidence (
 id uuid primary key default gen_random_uuid(), inspection_id uuid not null references public.vtg_inspection_requests(id) on delete cascade,
 uploaded_by uuid not null references public.profiles(id), storage_path text not null, file_name text not null,
 mime_type text, file_size_bytes bigint check(file_size_bytes is null or file_size_bytes between 0 and 52428800),
 evidence_type text not null, notes text, created_at timestamptz not null default now()
);
create index if not exists vtg_inspection_evidence_request_idx on public.vtg_inspection_evidence(inspection_id,created_at desc);
create index if not exists vtg_inspection_evidence_uploaded_by_idx on public.vtg_inspection_evidence(uploaded_by);
alter table public.vtg_inspection_evidence enable row level security;
drop policy if exists "Inspection parties read evidence" on public.vtg_inspection_evidence;
create policy "Inspection parties read evidence" on public.vtg_inspection_evidence for select to authenticated
using (exists(select 1 from public.vtg_inspection_requests i where i.id=inspection_id and
 (i.requested_by=(select auth.uid()) or i.supplier_id=(select auth.uid()) or i.inspector_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and p.is_active))));
drop policy if exists "Inspection parties upload evidence" on public.vtg_inspection_evidence;
create policy "Inspection parties upload evidence" on public.vtg_inspection_evidence for insert to authenticated
with check (uploaded_by=(select auth.uid()) and exists(select 1 from public.vtg_inspection_requests i where i.id=inspection_id and
 (i.requested_by=(select auth.uid()) or i.supplier_id=(select auth.uid()) or i.inspector_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and p.is_active))));
grant select,insert on public.vtg_inspection_evidence to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('vtg-inspection-evidence','vtg-inspection-evidence',false,52428800,array['image/jpeg','image/png','image/webp','application/pdf','video/mp4'])
on conflict(id) do update set public=false,file_size_limit=52428800,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Inspection participants read evidence objects" on storage.objects;
create policy "Inspection participants read evidence objects" on storage.objects for select to authenticated
using(bucket_id='vtg-inspection-evidence' and exists(select 1 from public.vtg_inspection_requests i where i.id::text=(storage.foldername(name))[1]
 and (i.requested_by=(select auth.uid()) or i.supplier_id=(select auth.uid()) or i.inspector_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and p.is_active))));
drop policy if exists "Inspection participants upload evidence objects" on storage.objects;
create policy "Inspection participants upload evidence objects" on storage.objects for insert to authenticated
with check(bucket_id='vtg-inspection-evidence' and (storage.foldername(name))[2]=(select auth.uid())::text and exists(
 select 1 from public.vtg_inspection_requests i where i.id::text=(storage.foldername(name))[1]
 and (i.requested_by=(select auth.uid()) or i.supplier_id=(select auth.uid()) or i.inspector_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and p.is_active))));
