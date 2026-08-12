-- VTG profile identity / branding
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_alt TEXT;
ALTER TABLE supplier_profiles ADD COLUMN IF NOT EXISTS company_logo_url TEXT;
ALTER TABLE supplier_profiles ADD COLUMN IF NOT EXISTS company_logo_alt TEXT;
ALTER TABLE bank_profiles ADD COLUMN IF NOT EXISTS institution_logo_url TEXT;
ALTER TABLE bank_profiles ADD COLUMN IF NOT EXISTS institution_logo_alt TEXT;

CREATE INDEX IF NOT EXISTS idx_users_profile_image ON users(profile_image_url);
CREATE INDEX IF NOT EXISTS idx_supplier_logo ON supplier_profiles(company_logo_url);
CREATE INDEX IF NOT EXISTS idx_bank_logo ON bank_profiles(institution_logo_url);
