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

test('payment API routes remain on the Railway fallback until Supabase payment parity is released', () => {
  const config = JSON.parse(root('vercel.json'));
  const paymentRoutes = ['/api/inspections/requests/:inspectionId/payment/initialize', '/api/inspections/payment/verify', '/api/webhooks/paystack', '/api/payments/intents'];
  for (const route of paymentRoutes) assert.equal(config.rewrites.some(x => x.source === route), false);
  const fallback = config.rewrites.find(x => x.source === '/api/:path*');
  assert.ok(fallback.destination.includes('railway.app/api/:path*'));
  const callback = root('inspection-payment-callback.html');
  assert.match(callback, /inspectionId/);
  assert.match(callback, /\\/api\\/inspections\\/payment\\/verify/);
});

test('trade documents remain private and signed downloads are scoped to authorised trade participants', () => {
  const migration = root('supabase/migrations/20261106123000_vtg_trade_workflow_hardening.sql');
  const docs = root('vtg-buyer-documents-supabase.js');
  assert.match(docs, /createSignedUrl/);
  assert.match(docs, /vtg-trade-documents/);
  assert.match(migration, /trade_documents/);
  assert.match(migration, /assigned lc banks read trade documents/);
  assert.match(migration, /assigned lc banks read private trade document objects/);
  assert.match(migration, /lc.bank_id = \(select auth.uid\(\)\)/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.vtg_confirm_inspection_payment/);
});


test('live logistics is session-authenticated and buyer-scoped; provider credentials remain server-side', () => {
  const fn = root('supabase/functions/vtg-live-tracking/index.ts');
  assert.match(fn, /auth\.getUser/);
  assert.match(fn, /profile\?\.role !== "buyer"/);
  assert.match(fn, /profile\?\.is_active !== true/);
  assert.match(fn, /order\.buyer_id !== buyerId/);
  assert.match(fn, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(fn, /VIZION_API_KEY/);
  assert.match(fn, /VESSELFINDER_API_KEY/);
  assert.match(fn, /source_mode === "sandbox"/);
  assert.match(fn, /Only timestamped provider events are stored/);
});

test('trade operations compatibility handler relies on participant RLS for shipment events and quote ownership', () => {
  const fn = root('supabase/functions/vtg-trade-operations/index.ts');
  assert.match(fn, /auth\.getUser/);
  assert.match(fn, /buyer_id,user\.id/);
  assert.match(fn, /created_by:user\.id/);
  assert.match(fn, /Only the shipment supplier or an administrator may add events/);
  assert.match(fn, /GET\|POST \/shipments\/:id\/events/);
});


test('wallet transfers are session-gated and delegated to the service-only idempotent ledger RPC', () => {
  const fn = root('supabase/functions/vtg-wallet/index.ts');
  assert.match(fn, /auth\.getUser/);
  assert.match(fn, /profile required|Active VTG profile required/);
  assert.match(fn, /vtg_wallet_transfer/);
  assert.match(fn, /idempotency_key/);
  assert.match(fn, /Insufficient wallet balance/);
});


test('supplier storefront publication is gated by VTG supplier verification', () => {
  const supplier = root('vtg-supplier-products-supabase.js');
  const buyer = root('vtg-buyer-marketplace-supabase.js');
  const migration = root('supabase/migrations/20261106123000_vtg_trade_workflow_hardening.sql');
  assert.match(supplier, /supplierVerificationStatus/);
  assert.match(supplier, /awaiting supplier verification/);
  assert.match(buyer, /verified supplier listings/);
  assert.match(migration, /UPDATE storage\.buckets SET public = false/);
});


test('bank workspace is verified-account scoped and exposes only assigned trade records', () => {
  const fn = root('supabase/functions/vtg-bank-trade-workspace/index.ts');
  const ui = root('vtg-bank-trade-supabase.js');
  const page = root('bank-trade-os.html');
  const migration = root('supabase/migrations/20261106123000_vtg_trade_workflow_hardening.sql');
  assert.match(fn, /profile\?\.role !== "bank"/);
  assert.match(fn, /account_environment !== "trade"/);
  assert.match(fn, /bank\.verification_status !== "verified"/);
  assert.match(fn, /\.eq\("bank_id", user\.id\)/);
  assert.match(fn, /vtg_bank_review_lc/);
  assert.match(fn, /does not issue LCs or execute\/release payments/);
  assert.match(ui, /createSignedUrl\(path, 60\)/);
  assert.match(ui, /vtg-bank-trade-workspace/);
  assert.match(page, /vtgBankLiveCases/);
  assert.match(page, /vtgBankLiveDocuments/);
  assert.match(page, /vtgBankLiveShipments/);
  assert.match(page, /vtgBankLivePayments/);
  assert.match(migration, /assigned lc banks read linked orders/);
  assert.match(migration, /assigned lc banks read linked shipments/);
  assert.match(migration, /assigned lc banks read linked shipment events/);
  assert.match(migration, /verified assigned bank or admin updates lc/);
  assert.match(migration, /vtg_bank_lc_review_events/);
  assert.match(migration, /vtg_guard_bank_lc_update/);
  assert.match(migration, /Banks may not change LC parties, terms, value or assignment/);
  assert.match(migration, /current_setting\('vtg\.bank_lc_review_note'/);
});
