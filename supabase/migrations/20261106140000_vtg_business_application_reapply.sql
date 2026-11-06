-- Allow a rejected supplier/bank applicant to reapply using the same authenticated email.
-- Pending applications cannot be duplicated or resubmitted; the existing identity is retained.
CREATE OR REPLACE FUNCTION public.vtg_resubmit_rejected_role_request(p_requested_role text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_previous public.role_requests%rowtype;
  v_new_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Sign in to your existing VTG account first' USING ERRCODE = '42501';
  END IF;

  IF p_requested_role NOT IN ('supplier','bank') THEN
    RAISE EXCEPTION 'Only supplier and bank applications can be resubmitted';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || p_requested_role, 0));

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id AND account_environment = 'trade'
  FOR UPDATE;

  IF NOT FOUND OR v_profile.role <> 'buyer' OR NOT v_profile.is_active THEN
    RAISE EXCEPTION 'This account is not eligible to resubmit this application' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.role_requests
    WHERE user_id = v_user_id
      AND requested_role = p_requested_role::public.vtg_account_role
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Only an application rejected by VTG can be resubmitted. Pending applications must wait for review.';
  END IF;

  SELECT * INTO v_previous
  FROM public.role_requests
  WHERE user_id = v_user_id
    AND requested_role = p_requested_role::public.vtg_account_role
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND OR v_previous.status <> 'rejected' THEN
    RAISE EXCEPTION 'Only an application rejected by VTG can be resubmitted. Pending applications must wait for review.';
  END IF;

  INSERT INTO public.role_requests (
    user_id, requested_role, organization_name, country,
    registration_reference, message, application_data, status
  ) VALUES (
    v_user_id, v_previous.requested_role, v_previous.organization_name,
    v_previous.country, v_previous.registration_reference, v_previous.message,
    v_previous.application_data, 'pending'
  )
  RETURNING id INTO v_new_id;

  INSERT INTO public.audit_events(actor_id,event_type,entity_type,entity_id,details)
  VALUES (
    v_user_id, 'role_request_resubmitted', 'role_request', v_new_id,
    jsonb_build_object('previous_request_id',v_previous.id,'requested_role',p_requested_role)
  );

  RETURN jsonb_build_object('id',v_new_id,'status','pending','requested_role',p_requested_role);
END;
$function$;

REVOKE ALL ON FUNCTION public.vtg_resubmit_rejected_role_request(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vtg_resubmit_rejected_role_request(text) TO authenticated;
