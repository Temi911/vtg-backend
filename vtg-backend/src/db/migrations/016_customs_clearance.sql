-- Phase 10: destination customs and release workflow.
CREATE TABLE IF NOT EXISTS shipment_customs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL UNIQUE REFERENCES shipments(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','documents_required','under_assessment','payment_due','inspection','cleared','released','on_hold')),
  authority TEXT,
  broker_name TEXT,
  declaration_ref TEXT,
  assessment_amount_usd NUMERIC(14,2),
  duties_amount_usd NUMERIC(14,2),
  taxes_amount_usd NUMERIC(14,2),
  other_charges_usd NUMERIC(14,2),
  notes TEXT,
  submitted_at TIMESTAMPTZ,
  assessed_at TIMESTAMPTZ,
  cleared_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shipment_customs_status ON shipment_customs(status);
