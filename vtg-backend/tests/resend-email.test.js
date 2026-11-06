'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const readRoot = (file) => fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');

test('shared Resend sender requires server-side credentials and validates recipients', () => {
  const email = readRoot('supabase/functions/_shared/vtg-email.ts');
  assert.match(email, /Deno\.env\.get\("RESEND_API_KEY"\)/);
  assert.match(email, /Deno\.env\.get\("VTG_EMAIL_FROM"\)/);
  assert.match(email, /valid recipient email is required/i);
  assert.match(email, /https:\/\/api\.resend\.com\/emails/);
  assert.match(email, /Idempotency-Key/);
  assert.doesNotMatch(email, /re_[A-Za-z0-9]{20,}/);
});

test('VTG email endpoint requires a verified active authenticated account', () => {
  const endpoint = readRoot('supabase/functions/vtg-email/index.ts');
  assert.match(endpoint, /auth\.getUser\(token\)/);
  assert.match(endpoint, /email_confirmed_at/);
  assert.match(endpoint, /profile\.data\?\.is_active/);
  assert.match(endpoint, /notification\.data/);
  assert.match(endpoint, /\.eq\("user_id", user\.id\)/);
});

test('role approval sends a best-effort applicant decision email only after the review RPC', () => {
  const endpoint = readRoot('supabase/functions/vtg-admin-roles/index.ts');
  assert.match(endpoint, /profile\.data\?\.role !== "admin"/);
  assert.match(endpoint, /vtg_admin_review_role_request/);
  assert.ok(endpoint.indexOf('vtg_admin_review_role_request') < endpoint.indexOf('await deliverTrackedEmail'));
  assert.match(endpoint, /business_application_" \+ body\.decision/);
  assert.match(endpoint, /email delivery is deliberately\s+best-effort/i);
});

test('company document review sends a best-effort verification update', () => {
  const endpoint = readRoot('supabase/functions/vtg-verification/index.ts');
  assert.match(endpoint, /if \(!admin\) return out\(\{ error: "Administrator required" \}/);
  assert.ok(endpoint.indexOf('reviewed_at: new Date()') < endpoint.indexOf('deliverTrackedEmail'));
  assert.match(endpoint, /company_verification_update/);
  assert.match(endpoint, /company-verification-document-review:/);
});

test('email delivery ledger is private to service-role operations', () => {
  const migration = readRoot('supabase/migrations/20261106100000_vtg_resend_email_delivery_log.sql');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.vtg_email_deliveries/i);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration, /REVOKE ALL ON public\.vtg_email_deliveries FROM anon, authenticated/i);
  assert.match(migration, /GRANT ALL ON public\.vtg_email_deliveries TO service_role/i);
});
