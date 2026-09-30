-- VTG inspection payment ledger. Payment provider integration can attach a real transaction reference later.
CREATE TABLE IF NOT EXISTS inspection_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID UNIQUE NOT NULL REFERENCES inspection_requests(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES users(id),
  amount_usd NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid',
  provider TEXT,
  provider_reference TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inspection_payments_buyer ON inspection_payments(buyer_id);
CREATE INDEX IF NOT EXISTS idx_inspection_payments_status ON inspection_payments(status);

ALTER TABLE inspection_requests ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE inspection_requests ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
