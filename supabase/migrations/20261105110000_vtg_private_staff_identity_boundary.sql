-- Keep public trade identities separate from invited internal workforce identities.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_environment text NOT NULL DEFAULT 'trade';

DO $$
BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_account_environment_check
    CHECK (account_environment IN ('trade','staff'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Existing administrator and agent identities are internal VTG accounts.
UPDATE public.profiles
SET account_environment = 'staff', updated_at = now()
WHERE role IN ('admin','agent') AND account_environment <> 'staff';

CREATE OR REPLACE FUNCTION public.vtg_create_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
    PERFORM 1
    FROM public.vtg_workforce_invitations i
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
    CASE WHEN staff_invite THEN 'agent'::public.vtg_account_role
         ELSE 'buyer'::public.vtg_account_role END,
    CASE WHEN staff_invite THEN 'staff' ELSE 'trade' END
  )
  ON CONFLICT (id) DO UPDATE SET email = excluded.email;

  IF NOT staff_invite THEN
    INSERT INTO public.buyer_profiles(user_id,buyer_type,company_name,registration_no,state)
    VALUES (
      new.id,
      CASE WHEN buyer_type_value IN ('individual','business','dealer','ngo')
        THEN buyer_type_value ELSE 'business' END,
      nullif(new.raw_user_meta_data->>'company_name',''),
      nullif(new.raw_user_meta_data->>'registration_no',''),
      nullif(new.raw_user_meta_data->>'state','')
    )
    ON CONFLICT (user_id) DO NOTHING;

    IF requested_role IN ('supplier','bank','agent')
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

CREATE OR REPLACE FUNCTION public.vtg_protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF (SELECT auth.uid()) = old.id AND NOT private.vtg_is_admin() THEN
    new.role := old.role;
    new.is_active := old.is_active;
    new.account_environment := old.account_environment;
  END IF;
  new.updated_at := now();
  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.vtg_accept_workforce_invitation(
  p_invitation_id uuid,p_user_id uuid,p_email text,p_token_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE inv public.vtg_workforce_invitations%rowtype;
BEGIN
  SELECT * INTO inv FROM public.vtg_workforce_invitations
  WHERE id=p_invitation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation not found'; END IF;
  IF inv.status<>'pending' OR inv.expires_at<=now() THEN
    UPDATE public.vtg_workforce_invitations SET status='expired',updated_at=now()
    WHERE id=inv.id AND status='pending' AND expires_at<=now();
    RAISE EXCEPTION 'Invitation is no longer valid';
  END IF;
  IF lower(inv.email)<>lower(trim(p_email)) THEN
    RAISE EXCEPTION 'Invitation email does not match';
  END IF;
  IF inv.token_hash IS DISTINCT FROM p_token_hash THEN
    RAISE EXCEPTION 'Invalid invitation token';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM auth.users u JOIN public.profiles p ON p.id=u.id
    WHERE u.id=p_user_id AND lower(u.email)=lower(inv.email)
      AND p.account_environment='staff' AND p.is_active=true
  ) THEN
    RAISE EXCEPTION 'A valid invited staff identity is required';
  END IF;
  INSERT INTO public.vtg_workforce_members(user_id,workspace_role,status,invited_by)
  VALUES(p_user_id,inv.workspace_role,'active',inv.invited_by)
  ON CONFLICT(user_id,workspace_role) DO UPDATE
  SET status='active',invited_by=excluded.invited_by,updated_at=now();
  UPDATE public.vtg_workforce_invitations
  SET status='accepted',accepted_user_id=p_user_id,accepted_at=now(),updated_at=now()
  WHERE id=inv.id;
  RETURN jsonb_build_object('accepted',true,'workspace_role',inv.workspace_role);
END;
$function$;

REVOKE ALL ON FUNCTION public.vtg_accept_workforce_invitation(uuid,uuid,text,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.vtg_accept_workforce_invitation(uuid,uuid,text,text)
  TO service_role;
REVOKE ALL ON FUNCTION public.vtg_accept_workforce_invitation(uuid,uuid,text)
  FROM PUBLIC,anon,authenticated;
