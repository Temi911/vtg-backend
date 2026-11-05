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
 values(v_reference,v_request.buyer_id,v_quote.supplier_id,null,'pending'::public.vtg_order_status,v_request.quantity::integer,v_quote.unit_price,v_quote.currency,v_quote.incoterms,null,null,
 concat_ws(E'\n','Sourcing market: '||v_request.sourcing_market,'Delivery country: '||v_request.destination,nullif(v_request.specifications,''),'Supplier lead time: '||v_quote.lead_time,case when v_quote.validity is not null then 'Quotation validity: '||v_quote.validity end,nullif(v_quote.notes,'')),p_request_id,p_quote_id)
 returning id into v_order_id;
 update public.supplier_trade_quotations set status='accepted',updated_at=now() where id=p_quote_id;
 update public.buyer_trade_requests set status='accepted',accepted_quote_id=p_quote_id,updated_at=now() where id=p_request_id;
 return v_order_id;
end;
$$;
revoke all on function public.vtg_accept_trade_quote(uuid,uuid) from public,anon;
grant execute on function public.vtg_accept_trade_quote(uuid,uuid) to authenticated;