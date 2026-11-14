-- Repair for 019_trade_documents_compliance.sql: its two ALTER statements were written on a
-- single `--` comment line (escaped newline characters), so they never ran. This migration applies
-- them idempotently. It only converts a column that is still an enum, so it is safe to run on
-- databases where the conversion already happened.
DO $$
DECLARE
  target RECORD;
BEGIN
  FOR target IN
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND column_name = 'doc_type'
      AND table_name IN ('documents', 'trade_document_requirements')
      AND data_type = 'USER-DEFINED'
  LOOP
    EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE TEXT USING %I::text',
                   target.table_name, target.column_name, target.column_name);
  END LOOP;
END $$;
