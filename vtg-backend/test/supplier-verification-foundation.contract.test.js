const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const migration = fs.readFileSync(
  path.join(root, 'supabase/migrations/20261123120000_vtg_supplier_verification_foundation.sql'),
  'utf8'
);
const supplierWorkspace = fs.readFileSync(path.join(root, 'vtg-business-verification-workspace.js'), 'utf8');
const adminWorkspace = fs.readFileSync(path.join(root, 'admin-dashboard.html'), 'utf8');
const adminLive = fs.readFileSync(path.join(root, 'vtg-admin-live.js'), 'utf8');

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

test('supplier workspace supports evidence upload and a separate level request', () => {
  assert.match(supplierWorkspace, /production_facility_evidence/);
  assert.match(supplierWorkspace, /trade_performance_evidence/);
  assert.match(supplierWorkspace, /vtg_supplier_verification_requests/);
  assert.match(supplierWorkspace, /Request a VTG verification level/);
  assert.match(supplierWorkspace, /requesting a level does not award it/i);
});

test('admin workspace reviews supplier verification requests through the protected RPC', () => {
  assert.match(adminWorkspace, /supplierVerificationRows/);
  assert.match(adminLive, /loadSupplierVerificationRequests/);
  assert.match(adminLive, /vtg_review_supplier_verification/);
  assert.match(adminLive, /p_decision: 'approved'/);
  assert.match(adminLive, /p_decision: 'rejected'/);
});

test('supplier verification guard trigger is not directly executable by API roles', () => {
  const hardening = fs.readFileSync(
    path.join(root, 'supabase/migrations/20261123123000_vtg_supplier_verification_guard_hardening.sql'),
    'utf8'
  );
  assert.match(hardening, /REVOKE ALL ON FUNCTION public\.vtg_guard_supplier_verification_fields\(\)/i);
  assert.match(hardening, /FROM PUBLIC, anon, authenticated/i);
});

test('public supplier profiles do not expose reviewer identity and expired evidence cannot qualify', () => {
  const privacy = fs.readFileSync(
    path.join(root, 'supabase/migrations/20261123130000_vtg_supplier_verification_public_profile_privacy.sql'),
    'utf8'
  );
  assert.match(privacy, /DROP COLUMN IF EXISTS verification_reviewed_by/i);
  assert.match(privacy, /d\.expires_at IS NULL OR d\.expires_at > now\(\)/i);
  assert.doesNotMatch(privacy, /verification_reviewed_by=/i);
});

test('supplier-visible requests do not contain internal reviewer identity', () => {
  const privacy = fs.readFileSync(
    path.join(root, 'supabase/migrations/20261123140000_vtg_supplier_verification_request_privacy.sql'),
    'utf8'
  );
  assert.match(privacy, /DROP COLUMN IF EXISTS reviewer_id/i);
  assert.match(privacy, /vtg_supplier_verification_reviews\(request_id,supplier_id,reviewer_id/i);
});

test('public marketplace view uses invoker permissions and is read-only', () => {
  const marketplace = fs.readFileSync(
    path.join(root, 'supabase/migrations/20261123150000_vtg_marketplace_view_security.sql'),
    'utf8'
  );
  assert.match(marketplace, /ALTER VIEW public\\.vtg_marketplace_products\\s+SET \\(security_invoker = true\\)/i);
  assert.match(marketplace, /REVOKE ALL ON public\\.vtg_marketplace_products FROM PUBLIC, anon, authenticated/i);
  assert.match(marketplace, /GRANT SELECT ON public\\.vtg_marketplace_products TO anon, authenticated/i);
});

test('buyer storefronts display awarded supplier verification levels without overstating legacy checks', () => {
  const marketplace = fs.readFileSync(path.join(root, 'vtg-buyer-marketplace-supabase.js'), 'utf8');
  const publicPage = fs.readFileSync(path.join(root, 'marketplace.html'), 'utf8');
  const requestForm = fs.readFileSync(path.join(root, 'vtg-buyer-request-supabase.js'), 'utf8');
  const viewMigration = fs.readFileSync(
    path.join(root, 'supabase/migrations/20261123150000_vtg_marketplace_view_security.sql'),
    'utf8'
  );
  assert.match(viewMigration, /supplier_verification_level/);
  assert.match(marketplace, /supplier_verification_level/);
  assert.match(publicPage, /supplier_verification_level/);
  assert.match(marketplace, /Business documents reviewed/);
  assert.match(publicPage, /Business documents reviewed/);
  assert.match(requestForm, /from\('vtg_marketplace_products'\)/);
  assert.doesNotMatch(requestForm, /from\('products'\)/);
});

test('marketplace quote RPC rejects products that are not approved and published', () => {
  const quoteGuard = fs.readFileSync(
    path.join(root, 'supabase/migrations/20261123160000_vtg_quote_request_requires_approved_listing.sql'),
    'utf8'
  );
  assert.match(quoteGuard, /p\\.is_verified = true/i);
  assert.match(quoteGuard, /p\\.review_status = 'approved'/i);
  assert.match(quoteGuard, /sp\\.verification_status = 'verified'/i);
  assert.match(quoteGuard, /An active buyer trade account is required/i);
  assert.match(quoteGuard, /Quantity is below the supplier minimum order quantity/i);
});
