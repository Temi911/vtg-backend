-- Buyer decision endpoint for supplier-submitted trade quotations.
-- Keeps quote acceptance and order confirmation atomic and buyer-authorized.

create or replace function public.vtg_decide_trade_quote(
  p_quote_id uuid,
  p_decision text
)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_quote public.trade_quotes%rowtype;
  v_order public.trade_orders%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_decision not in ('accepted', 'declined') then
    raise exception 'Decision must be accepted or declined' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = v_user_id
      and p.role = 'buyer'::public.vtg_account_role
      and p.is_active = true
  ) then
    raise exception 'An active buyer account is required' using errcode = '42501';
  end if;

  select * into v_quote
  from public.trade_quotes
  where id = p_quote_id
  for update;

  if not found or v_quote.buyer_id <> v_user_id then
    raise exception 'Quote not found' using errcode = 'P0002';
  end if;

  if v_quote.status <> 'quoted' then
    raise exception 'Only supplier-submitted quotes can be decided' using errcode = '22023';
  end if;

  if v_quote.valid_until is not null and v_quote.valid_until <= now() then
    raise exception 'This quote has expired' using errcode = '22023';
  end if;

  select * into v_order
  from public.trade_orders
  where id = v_quote.order_id
  for update;

  if not found or v_order.buyer_id <> v_user_id
     or v_order.supplier_id <> v_quote.supplier_id then
    raise exception 'The linked order is not valid for this quote' using errcode = '23514';
  end if;

  if p_decision = 'accepted' then
    if v_quote.unit_price is null then
      raise exception 'The supplier quote has no unit price' using errcode = '23514';
    end if;

    if v_order.status not in ('draft'::public.vtg_order_status, 'pending'::public.vtg_order_status) then
      raise exception 'The order is not awaiting quote acceptance' using errcode = '22023';
    end if;

    update public.trade_quotes
       set status = 'accepted', updated_at = now()
     where id = p_quote_id;

    update public.trade_orders
       set unit_price = v_quote.unit_price,
           currency = v_quote.currency,
           incoterm = coalesce(v_quote.incoterm, v_order.incoterm),
           status = 'confirmed',
           updated_at = now()
     where id = v_order.id;
  else
    update public.trade_quotes
       set status = 'declined', updated_at = now()
     where id = p_quote_id;
  end if;

  return v_order.id;
end;
$$;

revoke all on function public.vtg_decide_trade_quote(uuid, text) from public;
grant execute on function public.vtg_decide_trade_quote(uuid, text) to authenticated;
