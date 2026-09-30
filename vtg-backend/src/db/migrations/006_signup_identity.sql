-- VTG signup identity, country and institution details
-- Sensitive identity values are collected only for account/KYC workflows.
ALTER TABLE buyer_profiles ADD COLUMN IF NOT EXISTS identity_type TEXT;
ALTER TABLE buyer_profiles ADD COLUMN IF NOT EXISTS identity_number TEXT;
ALTER TABLE supplier_profiles ADD COLUMN IF NOT EXISTS identity_type TEXT;
ALTER TABLE supplier_profiles ADD COLUMN IF NOT EXISTS identity_number TEXT;
ALTER TABLE bank_profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Nigeria';
ALTER TABLE bank_profiles ADD COLUMN IF NOT EXISTS institution_type TEXT;
ALTER TABLE bank_profiles ADD COLUMN IF NOT EXISTS regulator TEXT;
ALTER TABLE bank_profiles ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE bank_profiles ADD COLUMN IF NOT EXISTS work_email TEXT;

CREATE INDEX IF NOT EXISTS idx_buyer_country ON buyer_profiles(country);
CREATE INDEX IF NOT EXISTS idx_supplier_country ON supplier_profiles(country);
CREATE INDEX IF NOT EXISTS idx_bank_country ON bank_profiles(country);
