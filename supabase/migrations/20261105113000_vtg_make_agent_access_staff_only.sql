-- Agent access is a private workforce assignment, not a public trade-role request.
DROP POLICY IF EXISTS "active buyers submit role requests" ON public.role_requests;
CREATE POLICY "active buyers submit supplier or bank requests"
ON public.role_requests
FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND requested_role IN ('supplier'::public.vtg_account_role,'bank'::public.vtg_account_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.role = 'buyer'::public.vtg_account_role
      AND p.account_environment = 'trade'
      AND p.is_active = true
  )
);

-- The profile trigger only creates public supplier/bank review requests.
-- A staff identity is created only from a matching, pending staff invitation.
CREATE OR REPLACE FUNCTION public.vtg_create_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  requested_role text;
  buyer_type_value text;
  invite_id_text text;
  invite_role text;
  staff_invite boolean := false;
BEGIN
  requested_role := new.raw_user_meta_data->>'requested_role';
  buyer_type_value := new.raw_user_meta_data->>'buyer_type';
  invite_id_text := new.raw_user_meta_data->>'workforce_invitation_id';
  invite_role := new.raw_user_meta_data->>'workforce_role';

  IF invite_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    PERFORM 1 FROM public.vtg_workforce_invitations i
    WHERE i.id = invite_id_text::uuid
      AND lower(i.email) = lower(new.email)
      AND i.workspace_role = invite_role
      AND i.status = 'pending'
      AND i.expires_at > now();
    staff_invite := FOUND;
  END IF;

  INSERT INTO public.profiles
    (id,email,full_name,phone,preferred_language,country,city,role,account_environment)
  VALUES (
    new.id,new.email,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    nullif(new.raw_user_meta_data->>'phone',''),
    coalesce(nullif(new.raw_user_meta_data->>'preferred_language',''),'en'),
    nullif(new.raw_user_meta_data->>'country',''),
    nullif(new.raw_user_meta_data->>'city',''),
    CASE WHEN staff_invite THEN 'agent'::public.vtg_account_role ELSE 'buyer'::public.vtg_account_role END,
    CASE WHEN staff_invite THEN 'staff' ELSE 'trade' END
  )
  ON CONFLICT (id) DO UPDATE SET email = excluded.email;

  IF NOT staff_invite THEN
    INSERT INTO public.buyer_profiles(user_id,buyer_type,company_name,registration_no,state)
    VALUES (
      new.id,
      CASE WHEN buyer_type_value IN ('individual','business','dealer','ngo') THEN buyer_type_value ELSE 'business' END,
      nullif(new.raw_user_meta_data->>'company_name',''),
      nullif(new.raw_user_meta_data->>'registration_no',''),
      nullif(new.raw_user_meta_data->>'state','')
    )
    ON CONFLICT (user_id) DO NOTHING;

    IF requested_role IN ('supplier','bank')
       AND nullif(trim(new.raw_user_meta_data->>'organization_name'),'') IS NOT NULL THEN
      INSERT INTO public.role_requests(
        user_id,requested_role,organization_name,country,registration_reference,message,application_data
      )
      VALUES (
        new.id,requested_role::public.vtg_account_role,
        trim(new.raw_user_meta_data->>'organization_name'),
        nullif(new.raw_user_meta_data->>'country',''),
        nullif(new.raw_user_meta_data->>'registration_reference',''),
        nullif(new.raw_user_meta_data->>'role_request_message',''),
        coalesce(new.raw_user_meta_data,'{}'::jsonb)
      );
    END IF;
  END IF;
  RETURN new;
END;
$function$;

-- Prevent an old or forged public role request from promoting an account into staff.
CREATE OR REPLACE FUNCTION public.vtg_admin_review_role_request(
  p_request_id uuid,p_decision text,p_reviewer_id uuid,p_notes text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public', 'private', 'auth'
AS $function$
DECLARE req public.role_requests%rowtype; caller_id uuid; app jsonb;
BEGIN
 caller_id:=auth.uid();
 IF caller_id IS NULL OR caller_id<>p_reviewer_id OR NOT private.vtg_is_admin() THEN
  RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501';
 END IF;
 IF p_decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Decision must be approved or rejected'; END IF;
 SELECT * INTO req FROM public.role_requests WHERE id=p_request_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Role request not found'; END IF;
 IF req.status<>'pending' THEN RAISE EXCEPTION 'Role request already reviewed'; END IF;
 IF req.requested_role NOT IN ('supplier'::public.vtg_account_role,'bank'::public.vtg_account_role) THEN
  RAISE EXCEPTION 'Internal staff roles are invitation-only';
 END IF;
 app:=coalesce(req.application_data,'{}'::jsonb);
 IF p_decision='approved' THEN
  IF req.requested_role='supplier' THEN
   INSERT INTO public.supplier_profiles AS sp(user_id,company_name,registration_no,country,city,verification_status)
   VALUES(req.user_id,req.organization_name,nullif(app->>'registration_no',''),coalesce(nullif(req.country,''),'China'),nullif(app->>'city',''),'pending')
   ON CONFLICT(user_id) DO UPDATE SET company_name=excluded.company_name,registration_no=coalesce(excluded.registration_no,sp.registration_no),country=excluded.country,city=coalesce(excluded.city,sp.city);
  ELSIF req.requested_role='bank' THEN
   INSERT INTO public.bank_profiles AS bp(user_id,bank_name,swift_code,branch_name,officer_name,officer_title,verification_status)
   VALUES(
    req.user_id,req.organization_name,
    coalesce(nullif(app->>'swiftCode',''),nullif(app->>'swift_code','')),
    coalesce(nullif(app->>'branch',''),nullif(app->>'branch_name','')),
    coalesce(nullif(app->>'full_name',''),nullif(app->>'fullName','')),
    coalesce(nullif(app->>'officerTitle',''),nullif(app->>'officer_title','')),'pending'
   )
   ON CONFLICT(user_id) DO UPDATE SET bank_name=excluded.bank_name,swift_code=coalesce(excluded.swift_code,bp.swift_code),branch_name=coalesce(excluded.branch_name,bp.branch_name),officer_name=coalesce(excluded.officer_name,bp.officer_name),officer_title=coalesce(excluded.officer_title,bp.officer_title);
  END IF;
  UPDATE public.profiles SET role=req.requested_role::public.vtg_account_role,updated_at=now() WHERE id=req.user_id;
 END IF;
 UPDATE public.role_requests SET status=p_decision,reviewer_id=caller_id,
   reviewer_notes=nullif(trim(coalesce(p_notes,'')),''),reviewed_at=now() WHERE id=req.id;
 INSERT INTO public.audit_events(actor_id,event_type,entity_type,entity_id,details)
 VALUES(caller_id,'role_request_'||p_decision,'role_request',req.id,
   jsonb_build_object('user_id',req.user_id,'requested_role',req.requested_role,'notes',p_notes));
 RETURN jsonb_build_object('id',req.id,'status',p_decision,'user_id',req.user_id,'role',req.requested_role);
END;
$function$;
