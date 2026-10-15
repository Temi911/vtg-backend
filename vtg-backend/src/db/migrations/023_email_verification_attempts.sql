ALTER TABLE email_verifications
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0);
ALTER TABLE email_verifications
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
