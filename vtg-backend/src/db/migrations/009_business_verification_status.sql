-- VTG supplier/bank business verification state
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS business_verification_status TEXT NOT NULL DEFAULT 'not_required'
  CHECK (business_verification_status IN ('not_required','pending','under_review','verified','needs_correction'));

CREATE INDEX IF NOT EXISTS idx_users_business_verification_status
  ON users(business_verification_status);
