const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const migration = fs.readFileSync(
  path.join(root, 'supabase/migrations/20261118150000_africa_first_trade_data_foundation.sql'),
  'utf8'
);

test('Africa trade foundation registers all 54 African markets with Nigeria first', () => {
  assert.match(migration, /create table if not exists public\.vtg_trade_markets/i);
  assert.match(migration, /\('NG','NGA','Nigeria','West Africa','active',1\)/);
  assert.match(migration, /\('GH','GHA','Ghana','West Africa','planned',10\)/);
  assert.match(migration, /\('ZA','ZAF','South Africa','Southern Africa','planned',10\)/);
  const rows = migration.match(/\('[A-Z]{2}','[A-Z]{3}','[^']+','(?:North|West|Central|East|Southern) Africa','(?:active|planned)',\d+\)/g) || [];
  assert.equal(rows.length, 54, 'expected 54 African country records');
});

test('Nigeria source registry distinguishes public references from live feeds', () => {
  assert.match(migration, /NG-NPA-FACILITIES/);
  assert.match(migration, /NG-NPA-DAILY-SHIPPING/);
  assert.match(migration, /UN-COMTRADE-PUBLIC/);
  assert.match(migration, /not a live port-operations feed/i);
  assert.match(migration, /not a live price or shipment feed/i);
});

test('Nigeria port records use official NPA facility profiles and public-only RLS', () => {
  for (const url of [
    'https://nigerianports.gov.ng/tincan/',
    'https://nigerianports.gov.ng/lagos-port/',
    'https://nigerianports.gov.ng/lekki/'
  ]) assert.ok(migration.includes(url), url);
  assert.match(migration, /alter table public\.vtg_trade_infrastructure enable row level security/i);
  assert.match(migration, /revoke insert, update, delete on public\.vtg_trade_infrastructure from anon, authenticated/i);
});
