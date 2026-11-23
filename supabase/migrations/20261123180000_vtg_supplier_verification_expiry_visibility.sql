-- Expired supplier verification must not remain visible as current trust.
DROP POLICY IF EXISTS "supplier profiles visible to owner admin or public when verified"
  ON public.supplier_profiles;
CREATE POLICY "supplier profiles visible to owner admin or public when verified"
  ON public.supplier_profiles
  FOR SELECT TO anon, authenticated
  USING (
    (
      verification_status = 'verified'::public.vtg_document_status
      AND (verification_expires_at IS NULL OR verification_expires_at > now())
    )
    OR (
      (SELECT auth.uid()) IS NOT NULL
      AND (
        user_id = (SELECT auth.uid())
        OR private.vtg_is_admin()
      )
    )
  );

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
 AND (sp.verification_expires_at IS NULL OR sp.verification_expires_at > now())
WHERE p.is_active
  AND p.is_verified
  AND p.review_status = 'approved';

REVOKE ALL ON public.vtg_marketplace_products FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.vtg_marketplace_products TO anon, authenticated;
