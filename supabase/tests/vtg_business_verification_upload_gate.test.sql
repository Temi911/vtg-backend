-- Applicants must not upload business evidence or logos until their account role is approved.
BEGIN;

INSERT INTO auth.users(id) VALUES
  ('20000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002');

INSERT INTO public.profiles(id,role,account_environment,is_active) VALUES
  ('20000000-0000-4000-8000-000000000001','buyer','trade',true),
  ('20000000-0000-4000-8000-000000000002','supplier','trade',true);

SET ROLE authenticated;

SELECT set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
DO $test$
DECLARE denied boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.vtg_verification_documents(
      user_id,account_role,doc_type,file_name,storage_path,mime_type,file_size_bytes
    ) VALUES (
      auth.uid(),'supplier','company_registration','pending.pdf',
      'vtg-verification-documents/'||auth.uid()||'/pending.pdf','application/pdf',100
    );
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'A buyer awaiting supplier approval uploaded verification metadata'; END IF;

  denied := false;
  BEGIN
    INSERT INTO storage.objects(bucket_id,name)
    VALUES ('vtg-verification-documents',auth.uid()||'/pending.pdf');
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'A buyer awaiting supplier approval uploaded a verification file'; END IF;

  denied := false;
  BEGIN
    INSERT INTO storage.objects(bucket_id,name)
    VALUES ('vtg-company-logos',auth.uid()||'/logo.png');
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'A buyer awaiting supplier approval uploaded a company logo'; END IF;
END
$test$;

SELECT set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',true);
INSERT INTO public.vtg_verification_documents(
  user_id,account_role,doc_type,file_name,storage_path,mime_type,file_size_bytes
) VALUES (
  auth.uid(),'supplier','company_registration','approved.pdf',
  'vtg-verification-documents/'||auth.uid()||'/approved.pdf','application/pdf',100
);
INSERT INTO storage.objects(bucket_id,name)
VALUES ('vtg-verification-documents',auth.uid()||'/approved.pdf');
INSERT INTO storage.objects(bucket_id,name)
VALUES ('vtg-company-logos',auth.uid()||'/logo.png');

RESET ROLE;
ROLLBACK;
