create or replace function public.vtg_create_trade_quote_request(
  p_product_id uuid,
  p_quantity integer,
  p_origin_country text default null,
  p_destination text default 'Tin Can Island, Lagos',
  p_buyer_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_buyer_id uuid := auth.uid();
  v_product public.products%rowtype;
  v_order_id uuid;
  v_quote_id uuid;
begin
  if v_buyer_id is null then raise exception 'Authentication required'; end if;
  if p_quantity is null or p_quantity < 1 then raise exception 'Quantity must be at least one'; end if;
  if not exists (select 1 from public.profiles p where p.id=v_buyer_id and p.role='buyer'::public.vtg_account_role and p.is_active=true) then
    raise exception 'An active buyer account is required';
  end if;
  select * into v_product from public.products p where p.id=p_product_id and p.is_active=true;
  if not found then raise exception 'The selected product is not available'; end if;
  if not exists (select 1 from public.profiles s where s.id=v_product.supplier_id and s.role='supplier'::public.vtg_account_role and s.is_active=true) then
    raise exception 'The product supplier is not currently active';
  end if;
  if p_quantity < v_product.minimum_order_quantity then raise exception 'Quantity is below the supplier minimum order quantity'; end if;
  insert into public.trade_orders (buyer_id,supplier_id,product_id,quantity,unit_price,currency,origin_port,destination_port,notes)
  values (v_buyer_id,v_product.supplier_id,v_product.id,p_quantity,0,coalesce(nullif(v_product.currency,''),'USD'),
    nullif(trim(coalesce(p_origin_country,'')),''),coalesce(nullif(trim(coalesce(p_destination,'')),''),'Tin Can Island, Lagos'),
    nullif(trim(coalesce(p_buyer_message,'')),'')) returning id into v_order_id;
  insert into public.trade_quotes (order_id,buyer_id,supplier_id,product_id,quantity,unit_price,currency,status,buyer_message)
  values (v_order_id,v_buyer_id,v_product.supplier_id,v_product.id,p_quantity,null,
    coalesce(nullif(v_product.currency,''),'USD'),'requested',nullif(trim(coalesce(p_buyer_message,'')),'')) returning id into v_quote_id;
  return jsonb_build_object('order_id',v_order_id,'quote_id',v_quote_id,'order_reference',(select reference from public.trade_orders where id=v_order_id));
end;
$$;
revoke all on function public.vtg_create_trade_quote_request(uuid,integer,text,text,text) from public;
grant execute on function public.vtg_create_trade_quote_request(uuid,integer,text,text,text) to authenticated;