-- Phase 9: explicit payment status history for reconciliation.
CREATE TABLE IF NOT EXISTS payment_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payment_requests(id) ON DELETE CASCADE,
  from_status payment_status,
  to_status payment_status NOT NULL,
  actor_id UUID NOT NULL REFERENCES users(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_payment_status_history_payment_created
  ON payment_status_history(payment_id, created_at DESC);
