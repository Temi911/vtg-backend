const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const shipments = fs.readFileSync(path.join(root, 'src/controllers/shipments.controller.js'), 'utf8');
const delivery = fs.readFileSync(path.join(root, 'src/controllers/shipment-delivery.controller.js'), 'utf8');
const events = fs.readFileSync(path.join(root, 'src/controllers/shipment-events.controller.js'), 'utf8');
const routes = fs.readFileSync(path.join(root, 'src/routes/shipments.routes.js'), 'utf8');

test('Atlas shipment access is role-scoped and live tracking checks shipment membership', () => {
  assert.match(shipments, /o\.buyer_id = \$1/);
  assert.match(shipments, /o\.supplier_id = \$1/);
  assert.match(shipments, /o\.bank_id = \$1/);
  assert.match(shipments, /assigned_agent/);
  assert.match(shipments, /if \(!allowed\) throw new AppError\('Forbidden', 403, 'FORBIDDEN'\)/);
});

test('tracking milestones are bounded and shipment completion cannot regress', () => {
  assert.match(shipments, /location: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(200\)/);
  assert.match(shipments, /detail: z\.string\(\)\.trim\(\)\.max\(1000\)\.optional\(\)/);
  assert.match(shipments, /PERCENT_COMPLETE_REGRESSION/);
  assert.match(shipments, /ACTIVE_MILESTONE_EXISTS/);
});

test('customs charges reject non-finite or unreasonable values', () => {
  assert.match(shipments, /assessmentAmountUsd: z\.number\(\)\.finite\(\)\.min\(0\)\.max\(1000000000000\)/);
  assert.match(shipments, /dutiesAmountUsd: z\.number\(\)\.finite\(\)\.min\(0\)\.max\(1000000000000\)/);
  assert.match(shipments, /INVALID_CUSTOMS_TRANSITION/);
  assert.match(delivery, /CUSTOMS_NOT_RELEASED/);
  assert.match(delivery, /PROOF_OF_DELIVERY_REQUIRED/);
});

test('shipment routes protect operations with authentication and role checks', () => {
  assert.match(routes, /router\.get\('\/atlas', requireAuth/);
  assert.match(routes, /router\.post\('\/', requireAuth, requireRole\('supplier'\)/);
  assert.match(routes, /router\.patch\('\/:shipmentId\/customs', requireAuth, requireRole\('supplier', 'bank', 'admin'\)/);
  assert.match(events, /o\.buyer_id=\$2 OR o\.supplier_id=\$2 OR o\.bank_id=\$2/);
});
