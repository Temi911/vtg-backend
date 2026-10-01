-- VTG account privacy and signup agreement acceptance
CREATE TABLE IF NOT EXISTS user_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agreement_version TEXT NOT NULL,
  privacy_version TEXT NOT NULL,
  terms_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  UNIQUE(user_id, agreement_version)
);

CREATE INDEX IF NOT EXISTS idx_user_agreements_user
  ON user_agreements(user_id, accepted_at DESC);
