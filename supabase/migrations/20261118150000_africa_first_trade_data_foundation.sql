-- Africa-first trade intelligence foundation.
-- Nigeria is the first active market; other African markets are pre-registered
-- so expansion does not require a schema redesign.

create table if not exists public.vtg_trade_markets (
  country_code text primary key check (country_code ~ '^[A-Z]{2}$'),
  country_code3 text not null unique check (country_code3 ~ '^[A-Z]{3}$'),
  country_name text not null unique,
  region text not null check (region in ('North Africa','West Africa','Central Africa','East Africa','Southern Africa')),
  market_status text not null default 'planned' check (market_status in ('active','planned','paused')),
  launch_priority integer not null default 100 check (launch_priority >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vtg_trade_data_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  source_name text not null,
  country_code text references public.vtg_trade_markets(country_code) on delete restrict,
  source_category text not null check (source_category in ('ports','customs','trade_statistics','national_statistics','shipping','regulation')),
  publisher text not null,
  source_url text not null check (source_url ~ '^https://'),
  access_type text not null default 'public_reference' check (access_type in ('public_reference','public_api','authenticated','licensed')),
  data_scope text not null,
  reliability_note text,
  is_published boolean not null default true,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vtg_trade_infrastructure (
  id text primary key,
  country_code text not null references public.vtg_trade_markets(country_code) on delete restrict,
  facility_name text not null,
  facility_type text not null check (facility_type in ('sea_port','airport','dry_port','border_post','inland_terminal')),
  city text not null,
  latitude numeric(9,6),
  longitude numeric(9,6),
  facility_code text,
  cargo_scope text,
  description text not null,
  authority_name text,
  authority_url text check (authority_url is null or authority_url ~ '^https://'),
  data_source_key text references public.vtg_trade_data_sources(source_key) on delete set null,
  is_published boolean not null default true,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vtg_trade_infrastructure_coordinates_pair check (
    (latitude is null and longitude is null) or
    (latitude between -90 and 90 and longitude between -180 and 180)
  )
);

create index if not exists vtg_trade_markets_status_priority_idx
  on public.vtg_trade_markets(market_status, launch_priority, country_name);
create index if not exists vtg_trade_data_sources_country_category_idx
  on public.vtg_trade_data_sources(country_code, source_category) where is_published;
create index if not exists vtg_trade_infrastructure_country_type_idx
  on public.vtg_trade_infrastructure(country_code, facility_type, facility_name) where is_published;

alter table public.vtg_trade_markets enable row level security;
alter table public.vtg_trade_data_sources enable row level security;
alter table public.vtg_trade_infrastructure enable row level security;

drop policy if exists "Published African markets are publicly readable" on public.vtg_trade_markets;
create policy "Published African markets are publicly readable"
  on public.vtg_trade_markets for select to anon, authenticated using (true);

drop policy if exists "Published trade data sources are publicly readable" on public.vtg_trade_data_sources;
create policy "Published trade data sources are publicly readable"
  on public.vtg_trade_data_sources for select to anon, authenticated using (is_published = true);

drop policy if exists "Published trade infrastructure is publicly readable" on public.vtg_trade_infrastructure;
create policy "Published trade infrastructure is publicly readable"
  on public.vtg_trade_infrastructure for select to anon, authenticated using (is_published = true);

revoke insert, update, delete on public.vtg_trade_markets from anon, authenticated;
revoke insert, update, delete on public.vtg_trade_data_sources from anon, authenticated;
revoke insert, update, delete on public.vtg_trade_infrastructure from anon, authenticated;
grant select on public.vtg_trade_markets to anon, authenticated;
grant select on public.vtg_trade_data_sources to anon, authenticated;
grant select on public.vtg_trade_infrastructure to anon, authenticated;

insert into public.vtg_trade_markets (country_code,country_code3,country_name,region,market_status,launch_priority) values
('DZ','DZA','Algeria','North Africa','planned',20),
('AO','AGO','Angola','Central Africa','planned',30),
('BJ','BEN','Benin','West Africa','planned',20),
('BW','BWA','Botswana','Southern Africa','planned',40),
('BF','BFA','Burkina Faso','West Africa','planned',40),
('BI','BDI','Burundi','East Africa','planned',50),
('CV','CPV','Cabo Verde','West Africa','planned',50),
('CM','CMR','Cameroon','Central Africa','planned',20),
('CF','CAF','Central African Republic','Central Africa','planned',60),
('TD','TCD','Chad','Central Africa','planned',50),
('KM','COM','Comoros','East Africa','planned',60),
('CG','COG','Congo','Central Africa','planned',40),
('CI','CIV','Côte d’Ivoire','West Africa','planned',20),
('CD','COD','Democratic Republic of the Congo','Central Africa','planned',30),
('DJ','DJI','Djibouti','East Africa','planned',30),
('EG','EGY','Egypt','North Africa','planned',20),
('GQ','GNQ','Equatorial Guinea','Central Africa','planned',50),
('ER','ERI','Eritrea','East Africa','planned',60),
('SZ','SWZ','Eswatini','Southern Africa','planned',50),
('ET','ETH','Ethiopia','East Africa','planned',20),
('GA','GAB','Gabon','Central Africa','planned',40),
('GM','GMB','Gambia','West Africa','planned',40),
('GH','GHA','Ghana','West Africa','planned',10),
('GN','GIN','Guinea','West Africa','planned',30),
('GW','GNB','Guinea-Bissau','West Africa','planned',50),
('KE','KEN','Kenya','East Africa','planned',10),
('LS','LSO','Lesotho','Southern Africa','planned',50),
('LR','LBR','Liberia','West Africa','planned',40),
('LY','LBY','Libya','North Africa','planned',40),
('MG','MDG','Madagascar','East Africa','planned',30),
('MW','MWI','Malawi','Southern Africa','planned',40),
('ML','MLI','Mali','West Africa','planned',40),
('MR','MRT','Mauritania','North Africa','planned',40),
('MU','MUS','Mauritius','East Africa','planned',30),
('MA','MAR','Morocco','North Africa','planned',20),
('MZ','MOZ','Mozambique','Southern Africa','planned',20),
('NA','NAM','Namibia','Southern Africa','planned',30),
('NE','NER','Niger','West Africa','planned',40),
('NG','NGA','Nigeria','West Africa','active',1),
('RW','RWA','Rwanda','East Africa','planned',20),
('ST','STP','São Tomé and Príncipe','Central Africa','planned',60),
('SN','SEN','Senegal','West Africa','planned',20),
('SC','SYC','Seychelles','East Africa','planned',50),
('SL','SLE','Sierra Leone','West Africa','planned',30),
('SO','SOM','Somalia','East Africa','planned',40),
('ZA','ZAF','South Africa','Southern Africa','planned',10),
('SS','SSD','South Sudan','East Africa','planned',50),
('SD','SDN','Sudan','North Africa','planned',30),
('TZ','TZA','Tanzania','East Africa','planned',10),
('TG','TGO','Togo','West Africa','planned',20),
('TN','TUN','Tunisia','North Africa','planned',30),
('UG','UGA','Uganda','East Africa','planned',10),
('ZM','ZMB','Zambia','Southern Africa','planned',20),
('ZW','ZWE','Zimbabwe','Southern Africa','planned',20)
on conflict (country_code) do update set
  country_code3 = excluded.country_code3,
  country_name = excluded.country_name,
  region = excluded.region,
  market_status = case when public.vtg_trade_markets.market_status = 'active' then 'active' else excluded.market_status end,
  launch_priority = excluded.launch_priority,
  updated_at = now();

insert into public.vtg_trade_data_sources
(source_key,source_name,country_code,source_category,publisher,source_url,access_type,data_scope,reliability_note)
values
('NG-NPA-FACILITIES','Nigerian Ports Authority facility profiles','NG','ports','Nigerian Ports Authority','https://nigerianports.gov.ng/','public_reference','Official Nigerian port authority and facility reference pages','Use the authority source for facility identity; this record is not a live port-operations feed.'),
('NG-NPA-DAILY-SHIPPING','NPA daily shipping position','NG','shipping','Nigerian Ports Authority','https://nigerianports.gov.ng/daily-shipping-position/','public_reference','Published daily shipping-position reference','Check publication date and source coverage before describing as current.'),
('UN-COMTRADE-PUBLIC','UN Comtrade public trade statistics','NG','trade_statistics','United Nations Statistics Division','https://comtradeapi.un.org/','public_api','Historical reported merchandise trade statistics by reporter, partner, flow and commodity','Public preview data may be delayed, revised or incomplete; not a live price or shipment feed.'),
('NG-NBS','National Bureau of Statistics Nigeria','NG','national_statistics','National Bureau of Statistics Nigeria','https://www.nigerianstat.gov.ng/','public_reference','Official Nigerian statistical publications and releases','Use publication-specific dates and methodology when presenting figures.')
on conflict (source_key) do update set
  source_name = excluded.source_name,
  country_code = excluded.country_code,
  source_category = excluded.source_category,
  publisher = excluded.publisher,
  source_url = excluded.source_url,
  access_type = excluded.access_type,
  data_scope = excluded.data_scope,
  reliability_note = excluded.reliability_note,
  updated_at = now();

insert into public.vtg_trade_infrastructure
(id,country_code,facility_name,facility_type,city,latitude,longitude,facility_code,cargo_scope,description,authority_name,authority_url,data_source_key,last_verified_at)
values
('ng-tincan','NG','Tin Can Island Port','sea_port','Lagos',6.430000,3.360000,'NGTIN','Container, vehicle and general cargo','A major Lagos port complex serving containerised cargo, vehicles and imports into Nigeria.','Nigerian Ports Authority','https://nigerianports.gov.ng/tincan/','NG-NPA-FACILITIES',null),
('ng-apapa','NG','Lagos Port Complex (Apapa)','sea_port','Lagos',6.450000,3.370000,'NGAPP','Container and general cargo','One of Nigeria’s principal port complexes, serving container and general cargo flows through the Lagos industrial and distribution region.','Nigerian Ports Authority','https://nigerianports.gov.ng/lagos-port/','NG-NPA-FACILITIES',null),
('ng-lekki','NG','Lekki Deep Sea Port','sea_port','Lekki, Lagos',6.410000,4.010000,'NGLEK','Deep-water container and multipurpose cargo','A deep-water port east of central Lagos, adding capacity for container, bulk and multipurpose cargo.','Nigerian Ports Authority','https://nigerianports.gov.ng/lekki/','NG-NPA-FACILITIES',null)
on conflict (id) do update set
  facility_name = excluded.facility_name,
  facility_type = excluded.facility_type,
  city = excluded.city,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  facility_code = excluded.facility_code,
  cargo_scope = excluded.cargo_scope,
  description = excluded.description,
  authority_name = excluded.authority_name,
  authority_url = excluded.authority_url,
  data_source_key = excluded.data_source_key,
  updated_at = now();

comment on table public.vtg_trade_markets is 'African country and market registry. Nigeria is the first active market; other countries are staged for phased expansion.';
comment on table public.vtg_trade_data_sources is 'Source registry for VTG public trade intelligence. Source metadata is not proof that a feed is live.';
comment on table public.vtg_trade_infrastructure is 'Public trade infrastructure directory; facility records do not imply live operational status.';
