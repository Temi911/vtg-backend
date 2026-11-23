const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('supplier catalogue insert has visible feedback and writes to the live Supabase products table', () => {
  const html = read('supplier-dashboard.html');
  const script = read('vtg-supplier-products-supabase.js');
  assert.match(html, /id="liveProductForm"/);
  assert.match(html, /id="liveProductFormNotice"/);
  assert.match(script, /db\.from\('products'\)\.insert\(payload\)\.select\('id'\)\.single\(\)/);
  assert.match(script, /function say\(message\)/);
  assert.match(script, /liveProductFormNotice/);
  assert.match(script, /catch\(error\)\{say\(error\.message/);
});

test('authenticated supplier inserts can resolve the private admin helper used by the review guard', () => {
  const migration = read('supabase/migrations/20261123190000_grant_authenticated_private_schema_usage.sql');
  assert.match(migration, /grant usage on schema private to authenticated/i);
  assert.doesNotMatch(migration, /grant usage on schema private to anon/i);
  assert.doesNotMatch(migration, /grant execute on all functions/i);
});

test('server-side workforce and inspection privileges are limited to service_role', () => {
  const migration = read('supabase/migrations/20261123190500_restore_edge_function_service_role_table_privileges.sql');
  for (const table of [
    'vtg_workforce_members',
    'vtg_workforce_invitations',
    'vtg_inspection_pricing',
    'vtg_inspection_requests',
  ]) {
    assert.match(migration, new RegExp('grant select, insert, update on public\\.' + table + ' to service_role', 'i'));
  }
  assert.match(migration, /grant select on public\.trade_orders to service_role/i);
  assert.match(migration, /grant update on public\.profiles to service_role/i);
  assert.match(migration, /grant insert on public\.audit_events to service_role/i);
  assert.doesNotMatch(migration, /to anon|to authenticated/i);
});
