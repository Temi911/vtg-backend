alter table public.vtg_inspection_pricing add column if not exists inspection_type text not null default 'product-quality-verification';
create index if not exists vtg_inspection_pricing_full_lookup_idx on public.vtg_inspection_pricing(country,inspection_type,service_level,category,min_quantity) where active;
with tiers(min_quantity,max_quantity,fee) as (values (1,100,10::numeric),(101,500,20::numeric),(501,1000,30::numeric),(1001,5000,45::numeric),(5001,10000,65::numeric),(10001,25000,90::numeric),(25001,50000,125::numeric)),
countries(country) as (values ('China'),('South Korea')),
categories(category) as (values ('cars-automobiles'),('motorcycles-tricycles-mobility'),('bicycles-personal-mobility'),('medical-supplies-healthcare'),('agriculture-farm-products'),('clothing-textiles'),('footwear'),('fashion-accessories'),('watches-wearables'),('electronics-technology'),('home-furniture'),('kitchen-home-appliances'),('beauty-personal-care'),('food-beverages'),('construction-equipment-machinery'),('tools-hardware'),('industrial-machinery-equipment'),('steel-iron-metal-products'),('solar-renewable-energy'),('plumbing-water-sanitary'),('packaging-printing'),('office-business-supplies'),('baby-children-products'),('cleaning-household-supplies'),('bags-luggage-travel'),('retail-commercial-equipment'),('hotel-restaurant-catering-equipment'),('factory-production-supplies'),('marine-port-equipment'),('logistics-transport-warehousing-equipment'),('building-materials'),('electrical-power-equipment'),('telecommunications-networking'),('industrial-materials'),('general-merchandise'),('import-export-trade-services')),
inspection_types(inspection_type) as (values ('factory-inspection'),('pre-shipment-inspection'),('product-quality-verification'),('sample-inspection')),
levels(service_level) as (values ('basic'),('standard'),('advanced'))
insert into public.vtg_inspection_pricing(country,category,inspection_type,service_level,min_quantity,max_quantity,buyer_fee_usd,agent_payout_usd,coordination_fee_usd,provider_fee_usd,active)
select c.country,cat.category,it.inspection_type,l.service_level,t.min_quantity,t.max_quantity,t.fee,0,t.fee,null,true
from countries c cross join categories cat cross join inspection_types it cross join levels l cross join tiers t
where not exists (
 select 1 from public.vtg_inspection_pricing p
 where p.country=c.country and p.category=cat.category and p.inspection_type=it.inspection_type
 and p.service_level=l.service_level and p.min_quantity=t.min_quantity
);