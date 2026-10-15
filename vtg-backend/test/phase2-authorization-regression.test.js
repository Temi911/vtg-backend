const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'src', 'controllers');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

// These are source-regression checks, not substitutes for authenticated API/database tests.
test('inspection payment cannot be self-confirmed when Paystack is unavailable', () => {
  const source = read('inspection.controller.js');
  assert.match(source, /const confirmPayment=asyncHandler\(async\(req,res\)=>\{throw new AppError/);
  assert.match(source, /PAYMENT_PROVIDER_UNAVAILABLE/);
  assert.doesNotMatch(source, /UPDATE inspection_payments SET status='paid'.*providerReference/);
});

test('quote expiry is limited to buyer/admin and conversion uses a conditional update', () => {
  const source = read('quotes.controller.js');
  assert.match(source, /status==='expired'.*req\.user\.id!==q\.buyer_id.*req\\.user\\.role\\s*!==\\s*'admin'/s);
  assert.match(source, /WHERE id=\$2 AND status='accepted' AND converted_order_id IS NULL RETURNING id/);
  assert.match(source, /QUOTE_CONVERSION_CONFLICT/);
});

test('letters of credit fail closed when no bank is assigned', () => {
  const source = read('lc.controller.js');
  assert.match(source, /BANK_ASSIGNMENT_REQUIRED/);
});

test('bank compliance-case updates are restricted to the assigned bank or admin', () => {
  const source = read('trade-documents.controller.js');
  assert.match(source, /o\\.bank_id\\s*===\\s*req\\.user\\.id/);
  assert.match(source, /req\\.user\\.role\\s*!==\\s*'admin'/);
});

test('shipment-event creation verifies the shipment/order and participant assignment', () => {
  const source = read('shipment-events.controller.js');
  assert.match(source, /FROM shipments s JOIN orders o ON o\.id=s\.order_id/);
  assert.match(source, /assigned_agent_id=\$2/);
  assert.match(source, /FORBIDDEN/);
});

test('order cancellation is limited to buyer/admin and protects execution-stage orders', () => {
  const source = read('orders.controller.js');
  assert.match(source, /req\\.user\\.role\\s*!==\\s*'admin'/);
  assert.match(source, /shipment execution has started|shipment.*started/i);
});
