alter table public.trade_orders
 add column if not exists source_request_id uuid references public.buyer_trade_requests(id) on delete set null,
 add column if not exists source_quote_id uuid references public.supplier_trade_quotations(id) on delete set null;
create unique index if not exists trade_orders_source_quote_id_unique on public.trade_orders(source_quote_id) where source_quote_id is not null;
grant insert on public.trade_orders to authenticated;

create table if not exists public.trade_negotiation_messages (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null references public.buyer_trade_requests(id) on delete cascade,
 quote_id uuid not null references public.supplier_trade_quotations(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 message_type text not null default 'message' check(message_type in ('message','offer','offer_acceptance','offer_decline')),
 body text not null check(char_length(body) between 1 and 2000),
 responds_to_id uuid references public.trade_negotiation_messages(id) on delete restrict,
 proposed_unit_price numeric check(proposed_unit_price is null or proposed_unit_price>0),
 proposed_currency text check(proposed_currency is null or proposed_currency in ('USD','CNY','KRW','NGN')),
 proposed_lead_time text,
 proposed_incoterms text,
 created_at timestamptz not null default now(),
 constraint trade_negotiation_message_shape check(
  (message_type='message' and responds_to_id is null and proposed_unit_price is null) or
  (message_type='offer' and responds_to_id is null and proposed_unit_price is not null) or
  (message_type in ('offer_acceptance','offer_decline') and responds_to_id is not null and proposed_unit_price is null)
 )
);
create index if not exists trade_negotiation_messages_quote_time_idx on public.trade_negotiation_messages(quote_id,created_at);
create unique index if not exists trade_negotiation_messages_single_response_idx on public.trade_negotiation_messages(responds_to_id) where message_type in ('offer_acceptance','offer_decline');
alter table public.trade_negotiation_messages enable row level security;
grant select,insert on public.trade_negotiation_messages to authenticated;
create policy "trade participants read negotiation messages" on public.trade_negotiation_messages for select to authenticated using (
 exists(select 1 from public.buyer_trade_requests r join public.supplier_trade_quotations q on q.request_id=r.id
 where r.id=trade_negotiation_messages.request_id and q.id=trade_negotiation_messages.quote_id
 and (r.buyer_id=(select auth.uid()) or q.supplier_id=(select auth.uid())))
);
create policy "trade participants append negotiation messages" on public.trade_negotiation_messages for insert to authenticated with check (
 sender_id=(select auth.uid())
 and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.is_active=true and p.role in ('buyer'::public.vtg_account_role,'supplier'::public.vtg_account_role))
 and exists(select 1 from public.buyer_trade_requests r join public.supplier_trade_quotations q on q.request_id=r.id
 where r.id=trade_negotiation_messages.request_id and q.id=trade_negotiation_messages.quote_id
 and (r.buyer_id=(select auth.uid()) or q.supplier_id=(select auth.uid())))
 and (message_type in ('message','offer') or
  (message_type in ('offer_acceptance','offer_decline') and exists(
   select 1 from public.trade_negotiation_messages target where target.id=trade_negotiation_messages.responds_to_id
   and target.request_id=trade_negotiation_messages.request_id and target.quote_id=trade_negotiation_messages.quote_id
   and target.sender_id<>(select auth.uid()) and target.message_type='offer')))
);

create or replace function public.vtg_apply_accepted_trade_offer() returns trigger
language plpgsql security invoker set search_path=''
as $$
declare v_offer public.trade_negotiation_messages%rowtype;
begin
 if new.message_type<>'offer_acceptance' then return new; end if;
 select * into v_offer from public.trade_negotiation_messages
 where id=new.responds_to_id and quote_id=new.quote_id and request_id=new.request_id and message_type='offer';
 if not found then raise exception 'The offer could not be found for this quotation.'; end if;
 update public.supplier_trade_quotations
 set unit_price=coalesce(v_offer.proposed_unit_price,unit_price),
     currency=coalesce(v_offer.proposed_currency,currency),
     lead_time=coalesce(v_offer.proposed_lead_time,lead_time),
     incoterms=coalesce(v_offer.proposed_incoterms,incoterms),
     status='submitted',updated_at=now()
 where id=new.quote_id;
 if not found then raise exception 'You do not have permission to apply these negotiated terms.'; end if;
 return new;
end;
$$;
create trigger trg_vtg_apply_accepted_trade_offer after insert on public.trade_negotiation_messages
for each row execute function public.vtg_apply_accepted_trade_offer();
revoke all on function public.vtg_apply_accepted_trade_offer() from public,anon,authenticated;

create table if not exists public.trade_order_milestones (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.trade_orders(id) on delete cascade,
 created_by uuid not null references auth.users(id) on delete cascade,
 milestone text not null check(milestone in ('order_confirmed','production_started','quality_check','ready_to_ship','shipped','in_transit','arrived','customs_clearance','delivered','note')),
 description text not null check(char_length(description) between 1 and 1600),
 location text,
 event_at timestamptz not null default now(),
 created_at timestamptz not null default now()
);
create index if not exists trade_order_milestones_order_time_idx on public.trade_order_milestones(order_id,event_at);
alter table public.trade_order_milestones enable row level security;
grant select,insert on public.trade_order_milestones to authenticated;
create policy "trade participants read order milestones" on public.trade_order_milestones for select to authenticated using (
 exists(select 1 from public.trade_orders o where o.id=trade_order_milestones.order_id and (o.buyer_id=(select auth.uid()) or o.supplier_id=(select auth.uid())))
);
create policy "trade participants append order milestones" on public.trade_order_milestones for insert to authenticated with check (
 created_by=(select auth.uid())
 and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.is_active=true and p.role in ('buyer'::public.vtg_account_role,'supplier'::public.vtg_account_role))
 and exists(select 1 from public.trade_orders o where o.id=trade_order_milestones.order_id and (o.buyer_id=(select auth.uid()) or o.supplier_id=(select auth.uid())))
);

create or replace function public.vtg_accept_trade_quote(p_request_id uuid,p_quote_id uuid)
returns uuid language plpgsql security invoker set search_path=''
as $$
declare v_request public.buyer_trade_requests%rowtype; v_quote public.supplier_trade_quotations%rowtype; v_order_id uuid; v_reference text;
begin
 if auth.uid() is null then raise exception 'Sign in before accepting a quotation.'; end if;
 if not exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='buyer'::public.vtg_account_role and p.is_active=true) then raise exception 'An active buyer account is required.'; end if;
 select * into v_request from public.buyer_trade_requests where id=p_request_id and buyer_id=(select auth.uid()) for update;
 if not found then raise exception 'This sourcing request is not available to your account.'; end if;
 if v_request.status='accepted' then
  select id into v_order_id from public.trade_orders where source_request_id=p_request_id and buyer_id=(select auth.uid()) limit 1;
  if v_order_id is not null then return v_order_id; end if;
  raise exception 'This request has already been accepted.';
 end if;
 select * into v_quote from public.supplier_trade_quotations where id=p_quote_id and request_id=p_request_id and status in ('submitted','countered') for update;
 if not found then raise exception 'This quotation is no longer available for acceptance.'; end if;
 if v_request.quantity<>trunc(v_request.quantity) then raise exception 'The order quantity must be a whole number before an order can be created.'; end if;
 v_reference:='VTG-ORD-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
 insert into public.trade_orders(reference,buyer_id,supplier_id,product_id,status,quantity,unit_price,currency,incoterm,origin_port,destination_port,notes,source_request_id,source_quote_id)
 values(v_reference,v_request.buyer_id,v_quote.supplier_id,null,'pending'::public.vtg_order_status,v_request.quantity::integer,v_quote.unit_price,v_quote.currency,v_quote.incoterms,v_request.sourcing_market,v_request.destination,
 concat_ws(E'\n',nullif(v_request.specifications,''),'Supplier lead time: '||v_quote.lead_time,case when v_quote.validity is not null then 'Quotation validity: '||v_quote.validity end,nullif(v_quote.notes,'')),p_request_id,p_quote_id)
 returning id into v_order_id;
 update public.supplier_trade_quotations set status='accepted',updated_at=now() where id=p_quote_id;
 update public.buyer_trade_requests set status='accepted',accepted_quote_id=p_quote_id,updated_at=now() where id=p_request_id;
 return v_order_id;
end;
$$;
revoke all on function public.vtg_accept_trade_quote(uuid,uuid) from public,anon;
grant execute on function public.vtg_accept_trade_quote(uuid,uuid) to authenticated;
