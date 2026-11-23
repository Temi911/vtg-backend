-- The public marketplace view must respect the caller's row-level policies.
ALTER VIEW public.vtg_marketplace_products
  SET (security_invoker = true);

-- The marketplace endpoint is read-only. Remove inherited broad grants and
-- grant only the read capability required by the public storefront.
REVOKE ALL ON public.vtg_marketplace_products FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.vtg_marketplace_products TO anon, authenticated;

-- Expose the awarded supplier level alongside approved marketplace listings.
-- Legacy document review without a tier is not labelled as VTG Verified.
CREATE OR REPLACE VIEW public.vtg_marketplace_products
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.supplier_id,
  p.name,
  p.category,
  p.description,
  p.unit_price,
  p.currency,
  p.minimum_order_quantity,
  p.hs_code,
  p.lead_time_days,
  p.origin_country,
  p.image_urls,
  p.created_at,
  COALESCE(NULLIF(sp.company_name, ''), 'Verified supplier') AS supplier_name,
  sp.country AS supplier_country,
  sp.logo_url AS supplier_logo_url,
  sp.rating AS supplier_rating,
  true AS is_verified,
  sp.verification_level AS supplier_verification_level
FROM public.products p
JOIN public.supplier_profiles sp
  ON sp.user_id = p.supplier_id
 AND sp.verification_status = 'verified'::public.vtg_document_status
WHERE p.is_active
  AND p.is_verified
  AND p.review_status = 'approved';

REVOKE ALL ON public.vtg_marketplace_products FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.vtg_marketplace_products TO anon, authenticated;
COMMENT ON VIEW public.vtg_marketplace_products IS
  'Approved active marketplace listings from verified suppliers, including the evidence-backed VTG verification level.';
