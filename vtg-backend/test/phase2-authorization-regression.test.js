const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'src', 'controllers');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

// Source-regression checks only; these do not replace API/database integration tests.
test('inspection payment cannot be self-confirmed when Paystack is unavailable', () => {
  const source = read('inspection.controller.js');
  assert.ok(source.includes('PAYMENT_PROVIDER_UNAVAILABLE'));
  assert.ok(source.includes('Online inspection payments are not configured; payment cannot be self-confirmed.'));
});

test('quote expiry is limited to buyer/admin and conversion uses a conditional update', () => {
  const source = read('quotes.controller.js');
  assert.ok(source.includes("status==='expired' && req.user.id!==q.buyer_id && req.user.role!=='admin'"));
  assert.ok(source.includes("WHERE id=$2 AND status='accepted' AND converted_order_id IS NULL RETURNING id"));
  assert.ok(source.includes('QUOTE_CONVERSION_CONFLICT'));
});

test('letters of credit fail closed when no bank is assigned', () => {
  assert.ok(read('lc.controller.js').includes('BANK_ASSIGNMENT_REQUIRED'));
});

test('bank compliance-case updates are restricted to the assigned bank', () => {
  const source = read('trade-documents.controller.js');
  assert.ok(source.includes('o.bank_id!==req.user.id'));
  assert.ok(source.includes('You are not the bank assigned to this order'));
});

test('shipment-event creation verifies shipment/order and agent assignment', () => {
  const source = read('shipment-events.controller.js');
  assert.ok(source.includes('FROM shipments s JOIN orders o ON o.id=s.order_id'));
  assert.ok(source.includes('assigned_agent_id=$2'));
});

test('order cancellation protects shipment execution-stage orders', () => {
  const source = read('orders.controller.js');
  assert.ok(source.includes('Only the buyer or an administrator can cancel this order'));
  assert.ok(source.includes('shipment execution has started'));
});
