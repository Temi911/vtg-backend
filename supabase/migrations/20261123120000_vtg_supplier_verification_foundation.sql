-- VTG Trust & Intelligence: evidence-backed supplier verification levels.
-- Existing vtg_verification_documents remains the private evidence store.
-- This migration adds a supplier-only request/review workflow and public trust metadata.

ALTER TABLE public.supplier_profiles
  ADD COLUMN IF NOT EXISTS verification_level text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS verification_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_summary text,
  ADD COLUMN IF NOT EXISTS verification_reviewed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS verification_reviewed_at timestamptz;

DO $$
BEGIN
  ALTER TABLE public.supplier_profiles
    ADD CONSTRAINT supplier_profiles_verification_level_check
    CHECK (verification_level IN (
      'unverified',
      'registered_business',
      'vtg_verified',
      'production_verified',
      'trade_performance_reviewed'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Supplier-owned requests contain no internal reviewer notes. Those are kept in
-- the separate admin-only review history table below.
CREATE TABLE IF NOT EXISTS public.vtg_supplier_verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_level text NOT NULL CHECK (requested_level IN (
    'registered_business',
    'vtg_verified',
    'production_verified',
    'trade_performance_reviewed'
  )),
  applicant_note text CHECK (applicant_note IS NULL OR length(applicant_note) <= 1500),
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','under_review','approved','rejected')),
  decision_summary text CHECK (decision_summary IS NULL OR length(decision_summary) <= 1500),
  awarded_level text CHECK (awarded_level IS NULL OR awarded_level IN (
    'registered_business',
    'vtg_verified',
    'production_verified',
    'trade_performance_reviewed'
  )),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewer_id uuid REFERENCES public.profiles(id),
  expires_at timestamptz,
  CONSTRAINT vtg_supplier_verification_approved_level_check
    CHECK ((status <> 'approved') OR awarded_level IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS vtg_supplier_verification_one_open_request
  ON public.vtg_supplier_verification_requests(supplier_id)
  WHERE status IN ('submitted','under_review');

CREATE INDEX IF NOT EXISTS vtg_supplier_verification_requests_queue_idx
  ON public.vtg_supplier_verification_requests(status, submitted_at DESC);

CREATE TABLE IF NOT EXISTS public.vtg_supplier_verification_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.vtg_supplier_verification_requests(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id),
  action text NOT NULL CHECK (action IN ('under_review','approved','rejected')),
  awarded_level text CHECK (awarded_level IS NULL OR awarded_level IN (
    'registered_business',
    'vtg_verified',
    'production_verified',
    'trade_performance_reviewed'
  )),
  reviewer_notes text CHECK (reviewer_notes IS NULL OR length(reviewer_notes) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vtg_supplier_verification_reviews_request_idx
  ON public.vtg_supplier_verification_reviews(request_id, created_at DESC);

ALTER TABLE public.vtg_supplier_verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vtg_supplier_verification_reviews ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.vtg_supplier_verification_requests FROM PUBLIC, anon;
REVOKE ALL ON public.vtg_supplier_verification_reviews FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.vtg_supplier_verification_requests TO authenticated;
GRANT SELECT, INSERT ON public.vtg_supplier_verification_reviews TO authenticated;

DROP POLICY IF EXISTS "Supplier reads own verification requests or admin" ON public.vtg_supplier_verification_requests;
CREATE POLICY "Supplier reads own verification requests or admin"
  ON public.vtg_supplier_verification_requests
  FOR SELECT TO authenticated
  USING (supplier_id = (SELECT auth.uid()) OR private.vtg_is_admin());

DROP POLICY IF EXISTS "Active supplier submits own verification request" ON public.vtg_supplier_verification_requests;
CREATE POLICY "Active supplier submits own verification request"
  ON public.vtg_supplier_verification_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    supplier_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'supplier'::public.vtg_account_role
        AND p.is_active = true
        AND p.account_environment = 'trade'
    )
    AND EXISTS (
      SELECT 1 FROM public.supplier_profiles sp
      WHERE sp.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Only admins update supplier verification requests" ON public.vtg_supplier_verification_requests;
CREATE POLICY "Only admins update supplier verification requests"
  ON public.vtg_supplier_verification_requests
  FOR UPDATE TO authenticated
  USING (private.vtg_is_admin())
  WITH CHECK (private.vtg_is_admin());

DROP POLICY IF EXISTS "Admins read supplier verification review history" ON public.vtg_supplier_verification_reviews;
CREATE POLICY "Admins read supplier verification review history"
  ON public.vtg_supplier_verification_reviews
  FOR SELECT TO authenticated
  USING (private.vtg_is_admin());

DROP POLICY IF EXISTS "Admins write supplier verification review history" ON public.vtg_supplier_verification_reviews;
CREATE POLICY "Admins write supplier verification review history"
  ON public.vtg_supplier_verification_reviews
  FOR INSERT TO authenticated
  WITH CHECK (private.vtg_is_admin() AND reviewer_id = (SELECT auth.uid()));

-- Prevent suppliers from editing the verification result or public trust claims
-- through the otherwise editable supplier profile.
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
        OR NEW.verification_reviewed_by IS NOT NULL
        OR NEW.verification_reviewed_at IS NOT NULL THEN
        RAISE EXCEPTION 'Supplier verification can only be assigned by VTG reviewers';
      END IF;
    ELSE
      IF NEW.verification_level IS DISTINCT FROM OLD.verification_level
        OR NEW.verification_expires_at IS DISTINCT FROM OLD.verification_expires_at
        OR NEW.verification_summary IS DISTINCT FROM OLD.verification_summary
        OR NEW.verification_reviewed_by IS DISTINCT FROM OLD.verification_reviewed_by
        OR NEW.verification_reviewed_at IS DISTINCT FROM OLD.verification_reviewed_at THEN
        RAISE EXCEPTION 'Supplier verification can only be changed by VTG reviewers';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS vtg_guard_supplier_verification_fields ON public.supplier_profiles;
CREATE TRIGGER vtg_guard_supplier_verification_fields
  BEFORE INSERT OR UPDATE ON public.supplier_profiles
  FOR EACH ROW EXECUTE FUNCTION public.vtg_guard_supplier_verification_fields();

-- Atomic reviewer decision: request state, awarded supplier level and private
-- review history are written together. This is SECURITY INVOKER and admin-only.
CREATE OR REPLACE FUNCTION public.vtg_review_supplier_verification(
  p_request_id uuid,
  p_decision text,
  p_awarded_level text DEFAULT NULL,
  p_decision_summary text DEFAULT NULL,
  p_reviewer_notes text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_request public.vtg_supplier_verification_requests%ROWTYPE;
  v_level_rank integer;
  v_requested_rank integer;
BEGIN
  IF NOT private.vtg_is_admin() THEN
    RAISE EXCEPTION 'Only authorised VTG reviewers may decide supplier verification';
  END IF;
  IF p_decision NOT IN ('under_review','approved','rejected') THEN
    RAISE EXCEPTION 'Unsupported supplier verification decision';
  END IF;

  SELECT * INTO v_request
  FROM public.vtg_supplier_verification_requests
  WHERE id = p_request_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Supplier verification request not found'; END IF;
  IF v_request.status NOT IN ('submitted','under_review') THEN
    RAISE EXCEPTION 'This supplier verification request has already been decided';
  END IF;

  IF p_decision = 'approved' THEN
    IF p_awarded_level IS NULL OR p_awarded_level NOT IN (
      'registered_business','vtg_verified','production_verified','trade_performance_reviewed'
    ) THEN
      RAISE EXCEPTION 'Choose a valid awarded verification level';
    END IF;

    v_level_rank := CASE p_awarded_level
      WHEN 'registered_business' THEN 1
      WHEN 'vtg_verified' THEN 2
      WHEN 'production_verified' THEN 3
      WHEN 'trade_performance_reviewed' THEN 4
    END;
    v_requested_rank := CASE v_request.requested_level
      WHEN 'registered_business' THEN 1
      WHEN 'vtg_verified' THEN 2
      WHEN 'production_verified' THEN 3
      WHEN 'trade_performance_reviewed' THEN 4
    END;
    IF v_level_rank > v_requested_rank THEN
      RAISE EXCEPTION 'A reviewer cannot award a level higher than the supplier requested';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.vtg_verification_documents d
      WHERE d.user_id = v_request.supplier_id
        AND d.account_role = 'supplier'
        AND d.doc_type = 'company_registration'
        AND d.status = 'verified'
    ) OR NOT EXISTS (
      SELECT 1 FROM public.vtg_verification_documents d
      WHERE d.user_id = v_request.supplier_id
        AND d.account_role = 'supplier'
        AND d.doc_type = 'company_address_proof'
        AND d.status = 'verified'
    ) THEN
      RAISE EXCEPTION 'Company registration and address evidence must be verified first';
    END IF;

    IF v_level_rank >= 2 AND (
      NOT EXISTS (
        SELECT 1 FROM public.vtg_verification_documents d
        WHERE d.user_id = v_request.supplier_id
          AND d.account_role = 'supplier'
          AND d.doc_type = 'business_license'
          AND d.status = 'verified'
      ) OR NOT EXISTS (
        SELECT 1 FROM public.vtg_verification_documents d
        WHERE d.user_id = v_request.supplier_id
          AND d.account_role = 'supplier'
          AND d.doc_type = 'tax_certificate'
          AND d.status = 'verified'
      )
    ) THEN
      RAISE EXCEPTION 'Business licence and tax evidence must be verified for VTG Verified status';
    END IF;

    IF v_level_rank >= 3 AND NOT EXISTS (
      SELECT 1 FROM public.vtg_verification_documents d
      WHERE d.user_id = v_request.supplier_id
        AND d.account_role = 'supplier'
        AND d.doc_type = 'production_facility_evidence'
        AND d.status = 'verified'
    ) THEN
      RAISE EXCEPTION 'Production facility evidence must be verified first';
    END IF;

    IF v_level_rank >= 4 AND NOT EXISTS (
      SELECT 1 FROM public.vtg_verification_documents d
      WHERE d.user_id = v_request.supplier_id
        AND d.account_role = 'supplier'
        AND d.doc_type = 'trade_performance_evidence'
        AND d.status = 'verified'
    ) THEN
      RAISE EXCEPTION 'Trade performance evidence must be verified first';
    END IF;
  ELSE
    p_awarded_level := NULL;
  END IF;

  UPDATE public.vtg_supplier_verification_requests
  SET status = p_decision,
      awarded_level = p_awarded_level,
      decision_summary = nullif(trim(p_decision_summary), ''),
      reviewer_id = (SELECT auth.uid()),
      reviewed_at = now(),
      expires_at = CASE WHEN p_decision = 'approved' THEN p_expires_at ELSE NULL END
  WHERE id = p_request_id;

  INSERT INTO public.vtg_supplier_verification_reviews(
    request_id,supplier_id,reviewer_id,action,awarded_level,reviewer_notes
  ) VALUES (
    p_request_id,v_request.supplier_id,(SELECT auth.uid()),p_decision,p_awarded_level,
    nullif(trim(p_reviewer_notes),'')
  );

  IF p_decision = 'approved' THEN
    UPDATE public.supplier_profiles
    SET verification_status = 'verified'::public.vtg_document_status,
        verification_level = p_awarded_level,
        verification_expires_at = p_expires_at,
        verification_summary = nullif(trim(p_decision_summary),''),
        verification_reviewed_by = (SELECT auth.uid()),
        verification_reviewed_at = now(),
        verified_at = now()
    WHERE user_id = v_request.supplier_id;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.vtg_review_supplier_verification(uuid,text,text,text,text,timestamptz)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vtg_review_supplier_verification(uuid,text,text,text,text,timestamptz)
  TO authenticated;
