-- Marketplace RFQ creation must enforce the same eligibility rules as the
-- public catalogue, even when a client calls the RPC with a stale/guessed ID.
CREATE OR REPLACE FUNCTION public.vtg_create_trade_quote_request(
  p_product_id uuid,
  p_quantity integer,
  p_origin_country text DEFAULT NULL,
  p_destination text DEFAULT 'Tin Can Island, Lagos',
  p_buyer_message text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $function$
DECLARE
  v_buyer_id uuid := auth.uid();
  v_product public.products%rowtype;
  v_order_id uuid;
  v_quote_id uuid;
BEGIN
  IF v_buyer_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_quantity IS NULL OR p_quantity < 1 THEN RAISE EXCEPTION 'Quantity must be at least one'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id=v_buyer_id
      AND p.role='buyer'::public.vtg_account_role AND p.is_active=true
      AND p.account_environment='trade'
  ) THEN RAISE EXCEPTION 'An active buyer trade account is required'; END IF;
  SELECT * INTO v_product FROM public.products p
    WHERE p.id=p_product_id AND p.is_active=true
      AND p.is_verified=true AND p.review_status='approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'The selected product is not an approved, published listing'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles s
    JOIN public.supplier_profiles sp ON sp.user_id=s.id
    WHERE s.id=v_product.supplier_id AND s.role='supplier'::public.vtg_account_role
      AND s.is_active=true AND s.account_environment='trade'
      AND sp.verification_status='verified'::public.vtg_document_status
  ) THEN RAISE EXCEPTION 'The supplier must have an active, verified trade account before buyers can request a quote'; END IF;
  IF p_quantity < v_product.minimum_order_quantity THEN
    RAISE EXCEPTION 'Quantity is below the supplier minimum order quantity';
  END IF;
  INSERT INTO public.trade_orders (
    buyer_id,supplier_id,product_id,quantity,unit_price,currency,origin_port,destination_port,notes
  ) VALUES (
    v_buyer_id,v_product.supplier_id,v_product.id,p_quantity,0,
    coalesce(nullif(v_product.currency,''),'USD'),null,
    coalesce(nullif(trim(coalesce(p_destination,'')),''),'Tin Can Island, Lagos'),
    nullif(trim(coalesce(p_buyer_message,'')),'')
  ) RETURNING id INTO v_order_id;
  INSERT INTO public.trade_quotes (
    order_id,buyer_id,supplier_id,product_id,quantity,unit_price,currency,status,buyer_message
  ) VALUES (
    v_order_id,v_buyer_id,v_product.supplier_id,v_product.id,p_quantity,null,
    coalesce(nullif(v_product.currency,''),'USD'),'requested',
    nullif(trim(coalesce(p_buyer_message,'')),'')
  ) RETURNING id INTO v_quote_id;
  RETURN jsonb_build_object(
    'order_id',v_order_id,'quote_id',v_quote_id,
    'order_reference',(SELECT reference FROM public.trade_orders WHERE id=v_order_id)
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.vtg_create_trade_quote_request(uuid,integer,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vtg_create_trade_quote_request(uuid,integer,text,text,text) TO authenticated;
