-- Trigger functions are invoked by PostgreSQL, not by the public Data API.
-- Remove direct EXECUTE privileges while preserving the trigger binding.
REVOKE ALL ON FUNCTION public.vtg_guard_supplier_verification_fields()
  FROM PUBLIC, anon, authenticated;
