alter table public.vtg_inspection_pricing
  add column if not exists coordination_fee_usd numeric(12,2),
  add column if not exists provider_fee_usd numeric(12,2);

alter table public.vtg_inspection_pricing
  add constraint vtg_inspection_pricing_coordination_fee_nonnegative
  check (coordination_fee_usd is null or coordination_fee_usd >= 0);

alter table public.vtg_inspection_pricing
  add constraint vtg_inspection_pricing_provider_fee_nonnegative
  check (provider_fee_usd is null or provider_fee_usd >= 0);

with tiers(min_quantity,max_quantity,fee) as (
  values
    (1,100,10::numeric),
    (101,500,20::numeric),
    (501,1000,30::numeric),
    (1001,5000,45::numeric),
    (5001,10000,65::numeric),
    (10001,25000,90::numeric),
    (25001,50000,125::numeric),
    (50001,null::integer,125::numeric)
), countries(country) as (values ('China'),('South Korea')),
levels(service_level) as (values ('basic'),('standard'),('advanced'))
insert into public.vtg_inspection_pricing
  (country,category,service_level,min_quantity,max_quantity,buyer_fee_usd,agent_payout_usd,coordination_fee_usd,provider_fee_usd,active)
select c.country,'general-merchandise',l.service_level,t.min_quantity,t.max_quantity,
       t.fee,0,t.fee,null,true
from countries c cross join levels l cross join tiers t
where not exists (
  select 1 from public.vtg_inspection_pricing p
  where p.country=c.country and p.category='general-merchandise'
    and p.service_level=l.service_level and p.min_quantity=t.min_quantity
);