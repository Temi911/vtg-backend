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

test('inspection payment routes use the Supabase inspection-payments function', () => {
  const config = JSON.parse(root('vercel.json'));
  const expected = new Map([
    ['/api/inspections/requests/:id/payment/initialize', 'vtg-inspection-payments/:id?action=initialize'],
    ['/api/inspections/payment/verify', 'vtg-inspection-payments?action=verify'],
    ['/api/webhooks/paystack', 'vtg-inspection-payments/webhook'],
  ]);
  for (const [source, target] of expected) {
    const route = config.rewrites.find(x => x.source === source);
    assert.ok(route, 'missing payment rewrite: ' + source);
    assert.ok(route.destination.includes(target), 'incorrect payment rewrite: ' + source);
  }
  const fallback = config.rewrites.find(x => x.source === '/api/:path*');
  assert.ok(fallback.destination.includes('lxrurbdzphqvkjprlfuv.supabase.co/functions/v1/vtg-api/'));
  assert.doesNotMatch(JSON.stringify(config.rewrites.filter(x => x.source.startsWith('/api/'))), /railway\\.app/i);
});
