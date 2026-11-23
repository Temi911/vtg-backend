-- Keep reviewer identity in the private review history, not the publicly
-- readable verified supplier profile.
CREATE OR REPLACE FUNCTION public.vtg_guard_supplier_verification_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL AND NOT private.vtg_is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.verification_level <> 'unverified'
        OR NEW.verification_expires_at IS NOT NULL
        OR NEW.verification_summary IS NOT NULL
        OR NEW.verification_reviewed_at IS NOT NULL THEN
        RAISE EXCEPTION 'Supplier verification can only be assigned by VTG reviewers';
      END IF;
    ELSE
      IF NEW.verification_level IS DISTINCT FROM OLD.verification_level
        OR NEW.verification_expires_at IS DISTINCT FROM OLD.verification_expires_at
        OR NEW.verification_summary IS DISTINCT FROM OLD.verification_summary
        OR NEW.verification_reviewed_at IS DISTINCT FROM OLD.verification_reviewed_at THEN
        RAISE EXCEPTION 'Supplier verification can only be changed by VTG reviewers';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

ALTER TABLE public.supplier_profiles
  DROP COLUMN IF EXISTS verification_reviewed_by;

CREATE OR REPLACE FUNCTION public.vtg_review_supplier_verification(
 p_request_id uuid,p_decision text,p_awarded_level text DEFAULT NULL,p_decision_summary text DEFAULT NULL,p_reviewer_notes text DEFAULT NULL,p_expires_at timestamptz DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $function$
DECLARE v_request public.vtg_supplier_verification_requests%ROWTYPE; v_level_rank integer; v_requested_rank integer;
BEGIN
 IF NOT private.vtg_is_admin() THEN RAISE EXCEPTION 'Only authorised VTG reviewers may decide supplier verification'; END IF;
 IF p_decision NOT IN ('under_review','approved','rejected') THEN RAISE EXCEPTION 'Unsupported supplier verification decision'; END IF;
 SELECT * INTO v_request FROM public.vtg_supplier_verification_requests WHERE id=p_request_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Supplier verification request not found'; END IF;
 IF v_request.status NOT IN ('submitted','under_review') THEN RAISE EXCEPTION 'This supplier verification request has already been decided'; END IF;
 IF p_decision='approved' THEN
  IF p_awarded_level IS NULL OR p_awarded_level NOT IN ('registered_business','vtg_verified','production_verified','trade_performance_reviewed') THEN RAISE EXCEPTION 'Choose a valid awarded verification level'; END IF;
  v_level_rank := CASE p_awarded_level WHEN 'registered_business' THEN 1 WHEN 'vtg_verified' THEN 2 WHEN 'production_verified' THEN 3 WHEN 'trade_performance_reviewed' THEN 4 END;
  v_requested_rank := CASE v_request.requested_level WHEN 'registered_business' THEN 1 WHEN 'vtg_verified' THEN 2 WHEN 'production_verified' THEN 3 WHEN 'trade_performance_reviewed' THEN 4 END;
  IF v_level_rank > v_requested_rank THEN RAISE EXCEPTION 'A reviewer cannot award a level higher than the supplier requested'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.vtg_verification_documents d WHERE d.user_id=v_request.supplier_id AND d.account_role='supplier' AND d.doc_type='company_registration' AND d.status='verified' AND (d.expires_at IS NULL OR d.expires_at > now()))
    OR NOT EXISTS (SELECT 1 FROM public.vtg_verification_documents d WHERE d.user_id=v_request.supplier_id AND d.account_role='supplier' AND d.doc_type='company_address_proof' AND d.status='verified' AND (d.expires_at IS NULL OR d.expires_at > now())) THEN
    RAISE EXCEPTION 'Current company registration and address evidence must be verified first';
  END IF;
  IF v_level_rank>=2 AND (
   NOT EXISTS (SELECT 1 FROM public.vtg_verification_documents d WHERE d.user_id=v_request.supplier_id AND d.account_role='supplier' AND d.doc_type='business_license' AND d.status='verified' AND (d.expires_at IS NULL OR d.expires_at > now()))
   OR NOT EXISTS (SELECT 1 FROM public.vtg_verification_documents d WHERE d.user_id=v_request.supplier_id AND d.account_role='supplier' AND d.doc_type='tax_certificate' AND d.status='verified' AND (d.expires_at IS NULL OR d.expires_at > now()))
  ) THEN RAISE EXCEPTION 'Current business licence and tax evidence must be verified for VTG Verified status'; END IF;
  IF v_level_rank>=3 AND NOT EXISTS (SELECT 1 FROM public.vtg_verification_documents d WHERE d.user_id=v_request.supplier_id AND d.account_role='supplier' AND d.doc_type='production_facility_evidence' AND d.status='verified' AND (d.expires_at IS NULL OR d.expires_at > now())) THEN
   RAISE EXCEPTION 'Current production facility evidence must be verified first';
  END IF;
  IF v_level_rank>=4 AND NOT EXISTS (SELECT 1 FROM public.vtg_verification_documents d WHERE d.user_id=v_request.supplier_id AND d.account_role='supplier' AND d.doc_type='trade_performance_evidence' AND d.status='verified' AND (d.expires_at IS NULL OR d.expires_at > now())) THEN
   RAISE EXCEPTION 'Current trade performance evidence must be verified first';
  END IF;
 ELSE
  p_awarded_level := NULL;
 END IF;
 UPDATE public.vtg_supplier_verification_requests SET status=p_decision,awarded_level=p_awarded_level,decision_summary=nullif(trim(p_decision_summary),''),reviewer_id=(SELECT auth.uid()),reviewed_at=now(),expires_at=CASE WHEN p_decision='approved' THEN p_expires_at ELSE NULL END WHERE id=p_request_id;
 INSERT INTO public.vtg_supplier_verification_reviews(request_id,supplier_id,reviewer_id,action,awarded_level,reviewer_notes)
 VALUES(p_request_id,v_request.supplier_id,(SELECT auth.uid()),p_decision,p_awarded_level,nullif(trim(p_reviewer_notes),''));
 IF p_decision='approved' THEN
  UPDATE public.supplier_profiles SET verification_status='verified'::public.vtg_document_status,verification_level=p_awarded_level,verification_expires_at=p_expires_at,verification_summary=nullif(trim(p_decision_summary),''),verification_reviewed_at=now(),verified_at=now()
  WHERE user_id=v_request.supplier_id;
 END IF;
END;
$function$;
REVOKE ALL ON FUNCTION public.vtg_review_supplier_verification(uuid,text,text,text,text,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vtg_review_supplier_verification(uuid,text,text,text,text,timestamptz) TO authenticated;
