-- Phase 9: internal settlement ledger for bank-confirmed payment outcomes.
-- This is an internal reconciliation record only; it does not move funds or alter wallet balances.
CREATE TABLE IF NOT EXISTS payment_settlement_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payment_requests(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('settlement','refund')),
  amount NUMERIC(16,2) NOT NULL,
  currency currency_code NOT NULL,
  provider_ref TEXT,
  recorded_by UUID NOT NULL REFERENCES users(id),
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(payment_id, entry_type)
);

CREATE INDEX IF NOT EXISTS ix_payment_settlement_ledger_order_created
  ON payment_settlement_ledger(order_id, created_at DESC);
