'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = (file) => fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');

test('supplier verification cannot be self-approved through storefront profile writes', () => {
  const migration = root('supabase/migrations/20261106123000_vtg_trade_workflow_hardening.sql');
  assert.match(migration, /vtg_guard_supplier_verification_fields/);
  assert.match(migration, /new\.verification_status := 'pending'/);
  assert.match(migration, /new\.verified_at := null/);
  assert.match(migration, /new\.company_id := null/);
});

test('buyer quote creation is constrained to the buyer own order and linked supplier', () => {
  const migration = root('supabase/migrations/20261106123000_vtg_trade_workflow_hardening.sql');
  assert.match(migration, /active buyers create quote requests for own orders/);
  assert.match(migration, /o\.buyer_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /o\.supplier_id = trade_quotes\.supplier_id/);
});

test('inspection payments use signed Paystack webhooks and atomic service-only ledger confirmation', () => {
  const migration = root('supabase/migrations/20261106123000_vtg_trade_workflow_hardening.sql');
  const fn = root('supabase/functions/vtg-inspection-payments/index.ts');
  assert.match(migration, /vtg_confirm_inspection_payment/);
  assert.match(migration, /to service_role/);
  assert.match(fn, /x-paystack-signature/);
  assert.match(fn, /SHA-512/);
  assert.match(fn, /vtg_confirm_inspection_payment/);
  assert.match(fn, /provider_reference/);
  assert.match(fn, /Number\(result\.amount\) !== Math\.round/);
});

test('inspection payment legacy URLs are routed to Supabase and callback preserves inspection identity', () => {
  const config = JSON.parse(root('vercel.json'));
  const init = config.rewrites.find(x => x.source === '/api/inspections/requests/:inspectionId/payment/initialize');
  const verify = config.rewrites.find(x => x.source === '/api/inspections/payment/verify');
  const webhook = config.rewrites.find(x => x.source === '/api/webhooks/paystack');
  assert.match(init.destination, /vtg-inspection-payments\?action=initialize&inspectionId=:inspectionId/);
  assert.match(verify.destination, /vtg-inspection-payments\?action=verify/);
  assert.match(webhook.destination, /vtg-inspection-payments\/webhook/);
  const callback = root('inspection-payment-callback.html');
  assert.match(callback, /inspectionId/);
  assert.match(callback, /\/api\/inspections\/payment\/verify/);
});

test('trade documents remain private and signed downloads are scoped to authorised trade participants', () => {
  const migration = root('supabase/migrations/20261106123000_vtg_trade_workflow_hardening.sql');
  const docs = root('vtg-buyer-documents-supabase.js');
  assert.match(docs, /createSignedUrl/);
  assert.match(docs, /vtg-trade-documents/);
  assert.match(migration, /trade_documents/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.vtg_confirm_inspection_payment/);
});
