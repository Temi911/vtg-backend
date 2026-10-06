-- Phase 15: trade document compliance workflow.
-- Extend the existing document enum without changing legacy values.
DO $$ BEGIN
  ALTER TYPE doc_type ADD VALUE IF NOT EXISTS 'customs_declaration';
  ALTER TYPE doc_type ADD VALUE IF NOT EXISTS 'duty_assessment';
  ALTER TYPE doc_type ADD VALUE IF NOT EXISTS 'customs_release';
  ALTER TYPE doc_type ADD VALUE IF NOT EXISTS 'proof_of_delivery';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS trade_compliance_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','documents_required','under_review','cleared','on_hold','closed')),
  authority TEXT,
  reference TEXT,
  notes TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trade_compliance_cases_status ON trade_compliance_cases(status);

CREATE TABLE IF NOT EXISTS trade_document_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  doc_type doc_type NOT NULL,
  label TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'required' CHECK (status IN ('required','uploaded','under_review','accepted','rejected','superseded','not_applicable')),
  due_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(order_id, doc_type)
);
CREATE INDEX IF NOT EXISTS idx_trade_doc_requirements_order ON trade_document_requirements(order_id);

CREATE TABLE IF NOT EXISTS trade_document_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trade_document_events_document ON trade_document_events(document_id, created_at DESC);
