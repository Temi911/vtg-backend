ALTER TABLE inspection_payments ADD COLUMN IF NOT EXISTS amount_ngn NUMERIC(14,2);
ALTER TABLE inspection_payments ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE inspection_payments ADD COLUMN IF NOT EXISTS provider_status TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_inspection_payments_provider_ref ON inspection_payments(provider_reference) WHERE provider_reference IS NOT NULL;
