alter table public.buyer_trade_requests
  add column if not exists title text,
  add column if not exists category text,
  add column if not exists unit text not null default 'units',
  add column if not exists incoterm text,
  add column if not exists destination_port text,
  add column if not exists budget_min numeric,
  add column if not exists budget_max numeric,
  add column if not exists quotation_deadline timestamptz,
  add column if not exists shipment_window_start date,
  add column if not exists shipment_window_end date,
  add column if not exists audience text not null default 'open_market',
  add column if not exists buyer_confidential boolean not null default false,
  add column if not exists required_certifications text,
  add column if not exists attachments jsonb not null default '[]'::jsonb,
  add column if not exists published_at timestamptz;

alter table public.buyer_rfq_drafts
  add column if not exists rfq_data jsonb not null default '{}'::jsonb;

alter table public.buyer_trade_requests
  add constraint buyer_trade_requests_audience_check
  check (audience in ('open_market','targeted','both'));
alter table public.buyer_trade_requests
  add constraint buyer_trade_requests_budget_check
  check (budget_min is null or budget_min >= 0);
alter table public.buyer_trade_requests
  add constraint buyer_trade_requests_budget_range_check
  check (budget_min is null or budget_max is null or budget_max >= budget_min);
alter table public.buyer_trade_requests
  add constraint buyer_trade_requests_attachments_array_check
  check (jsonb_typeof(attachments) = 'array');

create table if not exists public.buyer_rfq_targets (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.buyer_trade_requests(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  supplier_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(request_id,supplier_id)
);
create index if not exists buyer_rfq_targets_supplier_request_idx on public.buyer_rfq_targets(supplier_id,request_id);
alter table public.buyer_rfq_targets enable row level security;
grant select on public.buyer_rfq_targets to authenticated;
create policy "buyers and targeted suppliers read RFQ targets"
on public.buyer_rfq_targets for select to authenticated
using (buyer_id=(select auth.uid()) or supplier_id=(select auth.uid()));

drop policy if exists "buyers and eligible suppliers read trade requests" on public.buyer_trade_requests;
create policy "buyers and qualified suppliers read published RFQs"
on public.buyer_trade_requests for select to authenticated
using (
  buyer_id=(select auth.uid())
  or (
    status in ('open','quoted')
    and exists (
      select 1
      from public.profiles p
      join public.supplier_profiles sp on sp.user_id=p.id
      join public.products pr on pr.supplier_id=p.id
      where p.id=(select auth.uid())
        and p.role='supplier'::public.vtg_account_role
        and p.is_active=true
        and p.account_environment='trade'
        and sp.verification_status='verified'::public.vtg_document_status
        and (sp.verification_expires_at is null or sp.verification_expires_at>now())
        and pr.is_active=true and pr.is_verified=true and pr.review_status='approved'
        and (category is null or lower(trim(pr.category))=lower(trim(category)))
        and (
          audience in ('open_market','both')
          or exists(select 1 from public.buyer_rfq_targets t where t.request_id=id and t.supplier_id=(select auth.uid()))
        )
    )
  )
);

drop policy if exists "suppliers submit own quotations" on public.supplier_trade_quotations;
create policy "qualified suppliers submit quotations to eligible RFQs"
on public.supplier_trade_quotations for insert to authenticated
with check (
  supplier_id=(select auth.uid())
  and exists (
    select 1 from public.profiles p
    join public.supplier_profiles sp on sp.user_id=p.id
    where p.id=(select auth.uid())
      and p.role='supplier'::public.vtg_account_role
      and p.is_active=true and p.account_environment='trade'
      and sp.verification_status='verified'::public.vtg_document_status
      and (sp.verification_expires_at is null or sp.verification_expires_at>now())
  )
  and exists (
    select 1 from public.buyer_trade_requests r
    where r.id=request_id and r.status in ('open','quoted')
      and (r.quotation_deadline is null or r.quotation_deadline>now())
      and (
        r.audience in ('open_market','both')
        or exists(select 1 from public.buyer_rfq_targets t where t.request_id=r.id and t.supplier_id=(select auth.uid()))
      )
      and exists (
        select 1 from public.products pr
        where pr.supplier_id=(select auth.uid()) and pr.is_active=true
          and pr.is_verified=true and pr.review_status='approved'
          and (r.category is null or lower(trim(pr.category))=lower(trim(r.category)))
      )
  )
);

create or replace function public.vtg_publish_buyer_rfq(p_payload jsonb, p_supplier_ids uuid[] default '{}'::uuid[])
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_buyer uuid := auth.uid();
  v_product text := nullif(trim(coalesce(p_payload->>'product','')),'');
  v_title text := nullif(trim(coalesce(p_payload->>'title','')),'');
  v_category text := nullif(trim(coalesce(p_payload->>'category','')),'');
  v_market text := nullif(trim(coalesce(p_payload->>'sourcing_market','')),'');
  v_destination text := nullif(trim(coalesce(p_payload->>'destination','')),'');
  v_unit text := coalesce(nullif(trim(coalesce(p_payload->>'unit','')),''),'units');
  v_quantity numeric;
  v_audience text := coalesce(nullif(p_payload->>'audience',''),'open_market');
  v_deadline timestamptz;
  v_reference text;
  v_request_id uuid;
  v_recipients uuid[];
  v_count integer := 0;
begin
  if v_buyer is null then raise exception 'Sign in before publishing an RFQ.'; end if;
  if not exists(select 1 from public.profiles p where p.id=v_buyer and p.role='buyer'::public.vtg_account_role and p.is_active=true and p.account_environment='trade') then
    raise exception 'An active buyer trade account is required.';
  end if;
  if v_product is null or v_destination is null then raise exception 'Product and destination are required.'; end if;
  begin v_quantity := (p_payload->>'quantity')::numeric; exception when others then raise exception 'Enter a valid RFQ quantity.'; end;
  if v_quantity is null or v_quantity<=0 then raise exception 'Quantity must be greater than zero.'; end if;
  if v_audience not in ('open_market','targeted','both') then raise exception 'Choose a valid supplier audience.'; end if;
  if v_audience in ('targeted','both') and coalesce(cardinality(p_supplier_ids),0)=0 then
    raise exception 'Select at least one qualified supplier for a targeted RFQ.';
  end if;
  if nullif(p_payload->>'quotation_deadline','') is not null then
    begin v_deadline := (p_payload->>'quotation_deadline')::timestamptz; exception when others then raise exception 'Enter a valid quotation deadline.'; end;
    if v_deadline<=now() then raise exception 'The quotation deadline must be in the future.'; end if;
  end if;
  v_reference := 'VTG-RFQ-'||to_char(now() at time zone 'UTC','YYYY')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  select coalesce(array_agg(distinct p.id),'{}'::uuid[]) into v_recipients
  from public.profiles p
  join public.supplier_profiles sp on sp.user_id=p.id
  join public.products pr on pr.supplier_id=p.id
  where p.role='supplier'::public.vtg_account_role and p.is_active=true and p.account_environment='trade'
    and sp.verification_status='verified'::public.vtg_document_status
    and (sp.verification_expires_at is null or sp.verification_expires_at>now())
    and pr.is_active=true and pr.is_verified=true and pr.review_status='approved'
    and (v_category is null or lower(trim(pr.category))=lower(trim(v_category)))
    and (
      (v_audience in ('open_market','both'))
      or p.id=any(p_supplier_ids)
    )
    and (v_audience not in ('targeted','both') or p.id=any(p_supplier_ids) or v_audience='both');
  if v_audience='targeted' and coalesce(cardinality(v_recipients),0)=0 then
    raise exception 'None of the selected suppliers currently meet VTG RFQ eligibility requirements for this category.';
  end if;
  insert into public.buyer_trade_requests(
    reference,buyer_id,product,title,sourcing_market,category,quantity,unit,destination,destination_port,
    specifications,incoterm,budget_min,budget_max,quotation_deadline,shipment_window_start,shipment_window_end,
    audience,buyer_confidential,required_certifications,attachments,status,published_at
  ) values (
    v_reference,v_buyer,v_product,coalesce(v_title,v_product),coalesce(v_market,'Open to options'),v_category,v_quantity,v_unit,v_destination,
    nullif(trim(coalesce(p_payload->>'destination_port','')),''),
    nullif(trim(coalesce(p_payload->>'specifications','')),''),
    nullif(trim(coalesce(p_payload->>'incoterm','')),''),
    nullif(p_payload->>'budget_min','')::numeric,nullif(p_payload->>'budget_max','')::numeric,
    v_deadline,nullif(p_payload->>'shipment_window_start','')::date,nullif(p_payload->>'shipment_window_end','')::date,
    v_audience,coalesce((p_payload->>'buyer_confidential')::boolean,false),
    nullif(trim(coalesce(p_payload->>'required_certifications','')),''),
    case when jsonb_typeof(p_payload->'attachments')='array' then p_payload->'attachments' else '[]'::jsonb end,
    'open',now()
  ) returning id into v_request_id;
  insert into public.buyer_rfq_targets(request_id,buyer_id,supplier_id)
  select v_request_id,v_buyer,unnest(v_recipients);
  get diagnostics v_count = row_count;
  insert into public.vtg_notifications(user_id,title,body,notification_type,entity_type,entity_id)
  select distinct p.id,'New VTG sourcing request',
    'A buyer has published an RFQ matching your approved product catalogue. Reference: '||v_reference,
    'rfq_invitation','buyer_trade_request',v_request_id
  from public.profiles p where p.id=any(v_recipients);
  return jsonb_build_object('request_id',v_request_id,'reference',v_reference,'matched_suppliers',v_count);
end;
$function$;
revoke all on function public.vtg_publish_buyer_rfq(jsonb,uuid[]) from public,anon;
grant execute on function public.vtg_publish_buyer_rfq(jsonb,uuid[]) to authenticated;
