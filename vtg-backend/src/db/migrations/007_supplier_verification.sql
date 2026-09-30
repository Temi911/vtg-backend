-- VTG supplier verification details
-- Supplier signup is limited to China and South Korea in the frontend.
ALTER TABLE supplier_profiles ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE supplier_profiles ADD COLUMN IF NOT EXISTS regulator TEXT;
