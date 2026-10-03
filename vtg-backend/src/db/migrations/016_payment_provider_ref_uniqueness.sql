-- Provider references are external reconciliation identifiers and must not
-- be reused across payment records. Keep NULL allowed for providers that
-- have not returned a reference yet.
CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_requests_provider_ref
  ON payment_requests(provider_ref)
  WHERE provider_ref IS NOT NULL;
