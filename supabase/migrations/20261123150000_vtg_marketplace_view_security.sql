-- The public marketplace view must respect the caller's row-level policies.
ALTER VIEW public.vtg_marketplace_products
  SET (security_invoker = true);

-- The marketplace endpoint is read-only. Remove inherited broad grants and
-- grant only the read capability required by the public storefront.
REVOKE ALL ON public.vtg_marketplace_products FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.vtg_marketplace_products TO anon, authenticated;
