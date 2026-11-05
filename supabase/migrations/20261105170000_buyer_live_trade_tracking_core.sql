create table if not exists public.shipment_tracking_references (
 id uuid primary key default gen_random_uuid(), shipment_id uuid not null references public.shipments(id) on delete cascade,
 trade_order_id uuid not null references public.trade_orders(id) on delete cascade, buyer_id uuid not null references public.profiles(id) on delete cascade,
 reference_type text not null check (reference_type in ('container','bill_of_lading','booking')), reference_value text not null,
 carrier_code text, cargo_provider text not null check (cargo_provider in ('vizion','tracking_one')),
 provider_reference text, provider_status text not null default 'pending_provider' check (provider_status in ('pending_provider','registered','active','error','cancelled')),
 source_mode text not null default 'live' check (source_mode in ('sandbox','live')), metadata jsonb not null default '{}'::jsonb,
 last_synced_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique (shipment_id, reference_type, reference_value, cargo_provider)
);
create index if not exists shipment_tracking_refs_buyer_idx on public.shipment_tracking_references(buyer_id,created_at desc);
create index if not exists shipment_tracking_refs_shipment_idx on public.shipment_tracking_references(shipment_id);
create table if not exists public.shipment_tracking_events (
 id uuid primary key default gen_random_uuid(), tracking_reference_id uuid references public.shipment_tracking_references(id) on delete set null,
 shipment_id uuid not null references public.shipments(id) on delete cascade, trade_order_id uuid not null references public.trade_orders(id) on delete cascade,
 buyer_id uuid not null references public.profiles(id) on delete cascade, provider text not null check (provider in ('vizion','tracking_one')),
 provider_event_id text, idempotency_key text not null unique, event_code text, event_label text not null, description text, location text,
 latitude double precision, longitude double precision, event_time timestamptz not null, source_mode text not null default 'live' check (source_mode in ('sandbox','live')),
 raw_payload jsonb not null default '{}'::jsonb, received_at timestamptz not null default now(), created_at timestamptz not null default now(),
 check ((latitude is null and longitude is null) or (latitude between -90 and 90 and longitude between -180 and 180))
);
create index if not exists shipment_tracking_events_buyer_time_idx on public.shipment_tracking_events(buyer_id,event_time desc);
create index if not exists shipment_tracking_events_shipment_time_idx on public.shipment_tracking_events(shipment_id,event_time desc);
create unique index if not exists shipment_tracking_events_provider_id_idx on public.shipment_tracking_events(provider,provider_event_id) where provider_event_id is not null;
create table if not exists public.shipment_vessels (
 id uuid primary key default gen_random_uuid(), shipment_id uuid not null references public.shipments(id) on delete cascade,
 trade_order_id uuid not null references public.trade_orders(id) on delete cascade, buyer_id uuid not null references public.profiles(id) on delete cascade,
 vessel_name text, imo text, mmsi text, ais_provider text not null check (ais_provider in ('vesselfinder','marinetraffic')),
 source_mode text not null default 'live' check (source_mode in ('sandbox','live')), is_current boolean not null default true,
 linked_at timestamptz not null default now(), metadata jsonb not null default '{}'::jsonb, check (imo is not null or mmsi is not null)
);
create index if not exists shipment_vessels_buyer_idx on public.shipment_vessels(buyer_id,shipment_id);
create index if not exists shipment_vessels_imo_idx on public.shipment_vessels(imo) where imo is not null;
create index if not exists shipment_vessels_mmsi_idx on public.shipment_vessels(mmsi) where mmsi is not null;
create table if not exists public.vessel_position_latest (
 vessel_id uuid primary key references public.shipment_vessels(id) on delete cascade, shipment_id uuid not null references public.shipments(id) on delete cascade,
 trade_order_id uuid not null references public.trade_orders(id) on delete cascade, buyer_id uuid not null references public.profiles(id) on delete cascade,
 provider text not null check (provider in ('vesselfinder','marinetraffic')), latitude double precision not null check (latitude between -90 and 90),
 longitude double precision not null check (longitude between -180 and 180), speed_knots numeric, course_degrees numeric, heading_degrees numeric,
 navigation_status text, position_time timestamptz not null, received_at timestamptz not null default now(),
 source_mode text not null default 'live' check (source_mode in ('sandbox','live')), raw_payload jsonb not null default '{}'::jsonb
);
create index if not exists vessel_position_latest_buyer_idx on public.vessel_position_latest(buyer_id,position_time desc);
create table if not exists public.vessel_position_history (
 id bigint generated always as identity primary key, vessel_id uuid not null references public.shipment_vessels(id) on delete cascade,
 shipment_id uuid not null references public.shipments(id) on delete cascade, trade_order_id uuid not null references public.trade_orders(id) on delete cascade,
 buyer_id uuid not null references public.profiles(id) on delete cascade, provider text not null check (provider in ('vesselfinder','marinetraffic')),
 latitude double precision not null check (latitude between -90 and 90), longitude double precision not null check (longitude between -180 and 180),
 speed_knots numeric, course_degrees numeric, heading_degrees numeric, navigation_status text, position_time timestamptz not null,
 received_at timestamptz not null default now(), source_mode text not null default 'live' check (source_mode in ('sandbox','live')),
 raw_payload jsonb not null default '{}'::jsonb, unique(vessel_id,position_time,provider)
);
create index if not exists vessel_position_history_buyer_time_idx on public.vessel_position_history(buyer_id,position_time desc);
create schema if not exists private;
create table if not exists private.tracking_provider_logs (
 id bigint generated always as identity primary key, provider text not null, operation text not null, shipment_id uuid,
 status text not null, http_status integer, detail text, created_at timestamptz not null default now()
);
revoke all on schema private from public,anon,authenticated;
revoke all on private.tracking_provider_logs from public,anon,authenticated;
grant all on private.tracking_provider_logs to service_role;
alter table public.shipment_tracking_references enable row level security;
alter table public.shipment_tracking_events enable row level security;
alter table public.shipment_vessels enable row level security;
alter table public.vessel_position_latest enable row level security;
alter table public.vessel_position_history enable row level security;
drop policy if exists "buyers read own tracking references" on public.shipment_tracking_references;
create policy "buyers read own tracking references" on public.shipment_tracking_references for select to authenticated using (buyer_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='buyer' and p.is_active=true));
drop policy if exists "buyers read own tracking events" on public.shipment_tracking_events;
create policy "buyers read own tracking events" on public.shipment_tracking_events for select to authenticated using (buyer_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='buyer' and p.is_active=true));
drop policy if exists "buyers read own shipment vessels" on public.shipment_vessels;
create policy "buyers read own shipment vessels" on public.shipment_vessels for select to authenticated using (buyer_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='buyer' and p.is_active=true));
drop policy if exists "buyers read own latest vessel positions" on public.vessel_position_latest;
create policy "buyers read own latest vessel positions" on public.vessel_position_latest for select to authenticated using (buyer_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='buyer' and p.is_active=true));
drop policy if exists "buyers read own vessel history" on public.vessel_position_history;
create policy "buyers read own vessel history" on public.vessel_position_history for select to authenticated using (buyer_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='buyer' and p.is_active=true));
grant select on public.shipment_tracking_references,public.shipment_tracking_events,public.shipment_vessels,public.vessel_position_latest,public.vessel_position_history to authenticated;
grant all on public.shipment_tracking_references,public.shipment_tracking_events,public.shipment_vessels,public.vessel_position_latest,public.vessel_position_history to service_role;
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='shipment_tracking_events') then alter publication supabase_realtime add table public.shipment_tracking_events; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='vessel_position_latest') then alter publication supabase_realtime add table public.vessel_position_latest; end if;
 end if;
end $$;