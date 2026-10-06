CREATE TABLE IF NOT EXISTS partner_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_type TEXT NOT NULL CHECK (partner_type IN ('supplier','bank','agent','logistics','inspection','technology','institution')),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','suspended','rejected','ended')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (requester_id <> partner_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_relationship ON partner_relationships(requester_id,partner_id,partner_type);
CREATE INDEX IF NOT EXISTS idx_partner_relationships_partner ON partner_relationships(partner_id,status);
CREATE INDEX IF NOT EXISTS idx_partner_relationships_requester ON partner_relationships(requester_id,status);
