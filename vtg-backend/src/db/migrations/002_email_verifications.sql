CREATE TABLE IF NOT EXISTS email_verifications (email TEXT PRIMARY KEY, code_hash TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON email_verifications(expires_at);
