-- Transactional regression test for rejected business-application resubmission.
BEGIN;
INSERT INTO auth.users(id) VALUES ('10000000-0000-4000-8000-000000000001');
INSERT INTO public.profiles(id,role,account_environment,is_active)
VALUES ('10000000-0000-4000-8000-000000000001','buyer','trade',true);
INSERT INTO public.role_requests(
  user_id,requested_role,organization_name,country,registration_reference,
  message,status,application_data
) VALUES (
  '10000000-0000-4000-8000-000000000001','supplier','Example Trading Co','China',
  'REG-001','Original application','rejected',
  '{"registration_no":"REG-001","company_name":"Example Trading Co"}'::jsonb
);
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
DO $test$
DECLARE
  result jsonb;
  pending_count integer;
  blocked boolean := false;
BEGIN
  result := public.vtg_resubmit_rejected_role_request('supplier');
  IF result->>'status' <> 'pending' OR result->>'requested_role' <> 'supplier' THEN
    RAISE EXCEPTION 'Unexpected reapplication result: %', result;
  END IF;
  SELECT count(*) INTO pending_count
  FROM public.role_requests
  WHERE user_id='10000000-0000-4000-8000-000000000001' AND status='pending';
  IF pending_count <> 1 THEN RAISE EXCEPTION 'Expected exactly one pending reapplication'; END IF;

  BEGIN
    PERFORM public.vtg_resubmit_rejected_role_request('supplier');
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'Only an application rejected by VTG%' THEN RAISE; END IF;
    blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Duplicate pending reapplication was not blocked'; END IF;
END
$test$;
ROLLBACK;
