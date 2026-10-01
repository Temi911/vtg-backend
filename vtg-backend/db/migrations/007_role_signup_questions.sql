-- Role-specific signup questions collected during account creation.
ALTER TABLE buyer_profiles ADD COLUMN IF NOT EXISTS purchase_purpose TEXT;
ALTER TABLE buyer_profiles ADD COLUMN IF NOT EXISTS product_category TEXT;
ALTER TABLE buyer_profiles ADD COLUMN IF NOT EXISTS trade_frequency TEXT;
ALTER TABLE buyer_profiles ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE buyer_profiles ADD COLUMN IF NOT EXISTS import_license TEXT;

ALTER TABLE supplier_profiles ADD COLUMN IF NOT EXISTS business_model TEXT;
ALTER TABLE supplier_profiles ADD COLUMN IF NOT EXISTS product_category TEXT;
ALTER TABLE supplier_profiles ADD COLUMN IF NOT EXISTS export_markets TEXT;
ALTER TABLE supplier_profiles ADD COLUMN IF NOT EXISTS trade_years INTEGER;

ALTER TABLE bank_profiles ADD COLUMN IF NOT EXISTS vtg_services TEXT;
ALTER TABLE bank_profiles ADD COLUMN IF NOT EXISTS regulatory_status TEXT;
ALTER TABLE bank_profiles ADD COLUMN IF NOT EXISTS markets_served TEXT;
