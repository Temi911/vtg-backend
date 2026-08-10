-- Store provider/key metadata so document files are not tied to a server filesystem.
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS storage_provider TEXT,
  ADD COLUMN IF NOT EXISTS storage_key TEXT;

UPDATE documents
SET storage_provider = COALESCE(storage_provider, 'local')
WHERE storage_provider IS NULL;
