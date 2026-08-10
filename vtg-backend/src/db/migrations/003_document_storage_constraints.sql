-- Enforce storage metadata consistency for documents.
-- Existing local documents remain valid while production records can use S3.
CREATE INDEX IF NOT EXISTS idx_documents_storage_key ON documents(storage_key);
CREATE INDEX IF NOT EXISTS idx_documents_storage_provider ON documents(storage_provider);
