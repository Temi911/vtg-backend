-- Phase 10: final-mile delivery confirmation and proof.
CREATE TABLE IF NOT EXISTS shipment_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL UNIQUE REFERENCES shipments(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','disputed')),
  recipient_name TEXT,
  notes TEXT,
  proof_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shipment_delivery_status ON shipment_delivery(status);
