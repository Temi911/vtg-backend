-- Optional evidence expiry dates and efficient latest-document lookups.
-- Superseded state is derived from a newer upload of the same document type;
-- it is not written over the immutable review decision on the older record.
ALTER TABLE verification_documents
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_verification_documents_latest_by_type
  ON verification_documents(user_id, doc_type, uploaded_at DESC);
