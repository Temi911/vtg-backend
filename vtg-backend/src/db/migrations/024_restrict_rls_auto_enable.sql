-- Supabase projects can carry a helper function public.rls_auto_enable(). Functions are executable
-- by PUBLIC by default, which exposes it through the API roles. Revoke that access when the
-- function exists. No-op on databases without it (for example plain Railway Postgres).
DO $$
DECLARE
  fn regprocedure;
  role_name text;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn);
    FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM %I', fn, role_name);
      END IF;
    END LOOP;
  END LOOP;
END $$;
