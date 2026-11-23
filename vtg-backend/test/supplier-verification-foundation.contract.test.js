const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const migration = fs.readFileSync(
  path.join(root, 'supabase/migrations/20261123120000_vtg_supplier_verification_foundation.sql'),
  'utf8'
);

test('supplier verification has four evidence-backed levels', () => {
  for (const level of [
    'registered_business',
    'vtg_verified',
    'production_verified',
    'trade_performance_reviewed'
  ]) assert.ok(migration.includes(level), level);
  assert.match(migration, /production_facility_evidence/);
  assert.match(migration, /trade_performance_evidence/);
});

test('supplier verification requests are private and owner-scoped', () => {
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration, /supplier_id = \(SELECT auth\.uid\(\)\)/i);
  assert.match(migration, /private\.vtg_is_admin\(\)/i);
  assert.match(migration, /REVOKE ALL ON public\.vtg_supplier_verification_requests FROM PUBLIC, anon/i);
  assert.match(migration, /vtg_supplier_verification_one_open_request/);
});

test('supplier verification fields cannot be self-assigned', () => {
  assert.match(migration, /vtg_guard_supplier_verification_fields/);
  assert.match(migration, /Supplier verification can only be changed by VTG reviewers/);
});

test('only admins can award a level, with evidence requirements enforced atomically', () => {
  assert.match(migration, /SECURITY INVOKER/i);
  assert.match(migration, /Only authorised VTG reviewers may decide supplier verification/);
  assert.match(migration, /Company registration and address evidence must be verified first/);
  assert.match(migration, /Business licence and tax evidence must be verified for VTG Verified status/);
  assert.match(migration, /Production facility evidence must be verified first/);
  assert.match(migration, /Trade performance evidence must be verified first/);
  assert.match(migration, /INSERT INTO public\.vtg_supplier_verification_reviews/i);
});
