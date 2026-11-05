const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const dashboard = fs.readFileSync(path.join(root, 'buyer-dashboard.html'), 'utf8');
const financeClient = fs.readFileSync(path.join(root, 'vtg-buyer-finance-supabase.js'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20261105180000_buyer_fx_planning_notes.sql'), 'utf8');

test('buyer FX planner labels rates as user supplied and captures provenance', () => {
  assert.match(dashboard, /not a live FX quote or bank offer/i);
  assert.match(dashboard, /Rate source \/ reference/);
  assert.match(dashboard, /Rate date \(optional\)/);
  assert.match(dashboard, /fxCloudStatus/);
  assert.match(financeClient, /rate_source/);
  assert.match(financeClient, /rate_as_of/);
  assert.match(financeClient, /Enter a valid amount and rate/);
});

test('buyer FX planning notes use authenticated Supabase buyer-owned storage', () => {
  assert.match(dashboard, /vtg-buyer-finance-supabase\.js/);
  assert.match(financeClient, /window\.VTG_AUTH_READY/);
  assert.match(financeClient, /p\?\.role!=='buyer'/);
  assert.match(financeClient, /from\('buyer_fx_planning_notes'\)/);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /buyer_id=\(select auth\.uid\(\)\)/i);
  assert.match(migration, /p\.role='buyer' and p\.is_active=true/i);
  assert.match(migration, /revoke all on table public\.buyer_fx_planning_notes from anon, authenticated/i);
});

test('finance planner does not call an FX quote, wallet, exchange or payment endpoint', () => {
  assert.doesNotMatch(financeClient, /fetch\s*\(|functions\.invoke|wallet|exchange|transfer|payment/i);
  assert.match(dashboard, /No wallet, exchange rate, transfer or crypto payment is connected/i);
});
