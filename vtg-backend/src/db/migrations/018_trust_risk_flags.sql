-- Structured internal trust/risk flags with explicit provenance and resolution history.
CREATE TABLE IF NOT EXISTS trust_risk_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  category TEXT NOT NULL CHECK (length(trim(category)) BETWEEN 2 AND 80),
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  source_type TEXT NOT NULL CHECK (source_type IN ('official','licensed_provider','user_report','internal_review','other')),
  source_reference TEXT,
  rationale TEXT NOT NULL CHECK (length(trim(rationale)) BETWEEN 10 AND 2000),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (status IN ('resolved','dismissed') AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL AND length(trim(COALESCE(resolution_notes,''))) >= 5)
    OR
    (status IN ('open','reviewing') AND resolved_by IS NULL AND resolved_at IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_trust_risk_flags_subject_created
  ON trust_risk_flags(subject_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trust_risk_flags_status_severity
  ON trust_risk_flags(status, severity, created_at DESC);
