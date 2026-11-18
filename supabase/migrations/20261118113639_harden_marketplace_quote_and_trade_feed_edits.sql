-- Keep quote requests inside the verified VTG trade network.
-- Strengthen feed edits so an author must still be an eligible trade account
-- for the post type being saved.

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
as $function$
declare
  v_buyer_id uuid := auth.uid();
  v_product public.products%rowtype;
  v_order_id uuid;
  v_quote_id uuid;
begin
  if v_buyer_id is null then
    raise exception 'Authentication required';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'Quantity must be at least one';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_buyer_id
      and p.role = 'buyer'::public.vtg_account_role
      and p.is_active = true
      and p.account_environment = 'trade'
  ) then
    raise exception 'An active buyer trade account is required';
  end if;

  select *
  into v_product
  from public.products p
  where p.id = p_product_id
    and p.is_active = true;

  if not found then
    raise exception 'The selected product is not available';
  end if;

  if not exists (
    select 1
    from public.profiles s
    join public.supplier_profiles sp on sp.user_id = s.id
    where s.id = v_product.supplier_id
      and s.role = 'supplier'::public.vtg_account_role
      and s.is_active = true
      and s.account_environment = 'trade'
      and sp.verification_status = 'verified'::public.vtg_document_status
  ) then
    raise exception 'The supplier must have an active, verified trade account before buyers can request a quote';
  end if;

  if p_quantity < v_product.minimum_order_quantity then
    raise exception 'Quantity is below the supplier minimum order quantity';
  end if;

  -- Country is retained in the buyer message; origin_port remains unset
  -- until the buyer selects a real named port.
  insert into public.trade_orders (
    buyer_id, supplier_id, product_id, quantity, unit_price, currency,
    origin_port, destination_port, notes
  )
  values (
    v_buyer_id, v_product.supplier_id, v_product.id, p_quantity, 0,
    coalesce(nullif(v_product.currency, ''), 'USD'), null,
    coalesce(nullif(trim(coalesce(p_destination, '')), ''), 'Tin Can Island, Lagos'),
    nullif(trim(coalesce(p_buyer_message, '')), '')
  )
  returning id into v_order_id;

  insert into public.trade_quotes (
    order_id, buyer_id, supplier_id, product_id, quantity, unit_price,
    currency, status, buyer_message
  )
  values (
    v_order_id, v_buyer_id, v_product.supplier_id, v_product.id, p_quantity,
    null, coalesce(nullif(v_product.currency, ''), 'USD'), 'requested',
    nullif(trim(coalesce(p_buyer_message, '')), '')
  )
  returning id into v_quote_id;

  return jsonb_build_object(
    'order_id', v_order_id,
    'quote_id', v_quote_id,
    'order_reference', (select reference from public.trade_orders where id = v_order_id)
  );
end;
$function$;

drop policy if exists "Authors can edit own trade posts" on public.vtg_trade_posts;

create policy "Eligible authors can edit own trade posts"
on public.vtg_trade_posts
for update
to authenticated
using (
  author_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active = true
      and (p.account_environment = 'trade' or p.role = 'admin'::public.vtg_account_role)
      and (
        (post_type = any (array['advert'::text, 'product'::text])
          and p.role = any (array['supplier'::public.vtg_account_role, 'admin'::public.vtg_account_role]))
        or
        (post_type = 'announcement'
          and p.role = any (array['supplier'::public.vtg_account_role, 'bank'::public.vtg_account_role, 'admin'::public.vtg_account_role]))
        or
        (post_type = any (array['update'::text, 'news'::text, 'trade_tip'::text, 'video'::text]))
      )
  )
)
with check (
  author_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active = true
      and (p.account_environment = 'trade' or p.role = 'admin'::public.vtg_account_role)
      and (
        (post_type = any (array['advert'::text, 'product'::text])
          and p.role = any (array['supplier'::public.vtg_account_role, 'admin'::public.vtg_account_role]))
        or
        (post_type = 'announcement'
          and p.role = any (array['supplier'::public.vtg_account_role, 'bank'::public.vtg_account_role, 'admin'::public.vtg_account_role]))
        or
        (post_type = any (array['update'::text, 'news'::text, 'trade_tip'::text, 'video'::text]))
      )
  )
);

revoke all on function public.vtg_create_trade_quote_request(uuid, integer, text, text, text) from public, anon;
grant execute on function public.vtg_create_trade_quote_request(uuid, integer, text, text, text) to authenticated;
