const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.resolve(__dirname, '..', 'src', 'db', 'migrations');

test('no migration hides SQL behind literal backslash-n sequences', () => {
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql'))) {
    if (file === '019_trade_documents_compliance.sql') continue; // historical file, repaired by 023
    assert.doesNotMatch(fs.readFileSync(path.join(dir, file), 'utf8'), /\\n/, `${file} contains a literal \\n`);
  }
});

test('migration 023 converts enum doc_type columns idempotently', () => {
  const sql = fs.readFileSync(path.join(dir, '023_repair_trade_document_types.sql'), 'utf8');
  assert.match(sql, /data_type = 'USER-DEFINED'/);
  assert.match(sql, /'documents', 'trade_document_requirements'/);
  assert.match(sql, /TYPE TEXT USING/);
});

test('migration 024 only revokes when rls_auto_enable exists and never grants', () => {
  const sql = fs.readFileSync(path.join(dir, '024_restrict_rls_auto_enable.sql'), 'utf8');
  assert.match(sql, /proname = 'rls_auto_enable'/);
  assert.match(sql, /REVOKE EXECUTE/);
  assert.doesNotMatch(sql, /\bGRANT\b/i);
});
