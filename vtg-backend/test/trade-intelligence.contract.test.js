const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeRecord, calculateIndicativeLandedCost } = require('../src/services/trade-intelligence.contract');

const future = (minutes) => new Date(Date.now() + minutes * 60 * 1000).toISOString();
const past = (minutes) => new Date(Date.now() - minutes * 60 * 1000).toISOString();

test('live intelligence records require retrieval timestamps', () => {
  assert.throws(() => normalizeRecord({
    schemaVersion: '1.0', kind: 'country_rule', status: 'live', title: 'Import rule',
    source: { name: 'Customs authority', authority: 'official' },
  }));
});

test('record normalization identifies expired source evidence as stale', () => {
  const record = normalizeRecord({
    schemaVersion: '1.0', kind: 'fx_rate', status: 'live', title: 'USD/NGN reference',
    currency: 'ngn', value: 1500,
    source: { name: 'Official reference', authority: 'official', retrievedAt: past(10), validUntil: past(1) },
  });
  assert.equal(record.currency, 'NGN');
  assert.equal(record.freshness, 'stale');
  assert.equal(record.isDecisionReady, false);
});

test('fresh official source records can be marked decision-ready without claiming legal certainty', () => {
  const record = normalizeRecord({
    schemaVersion: '1.0', kind: 'country_rule', status: 'live', title: 'Published import notice',
    source: { name: 'Official authority', authority: 'official', retrievedAt: past(2), validUntil: future(30) },
  });
  assert.equal(record.freshness, 'current');
  assert.equal(record.isDecisionReady, true);
});

test('landed cost estimate calculates CIF, duty, VAT and other charges transparently', () => {
  const result = calculateIndicativeLandedCost({
    currency: 'usd', goodsValue: 1000, freight: 100, insurance: 10,
    dutyRate: 0.05, vatRate: 0.075, vatBasis: 'cif_plus_duty', otherCharges: 20,
  });
  assert.equal(result.currency, 'USD');
  assert.equal(result.status, 'indicative');
  assert.equal(result.components.cif, 1110);
  assert.equal(result.components.duty, 55.5);
  assert.equal(result.components.vat, 87.41);
  assert.equal(result.estimatedTotal, 1272.91);
  assert.ok(result.limitations.length > 0);
});

test('landed cost rejects negative inputs and impossible rates', () => {
  assert.throws(() => calculateIndicativeLandedCost({ currency: 'USD', goodsValue: -1, dutyRate: 0.1 }));
  assert.throws(() => calculateIndicativeLandedCost({ currency: 'USD', goodsValue: 10, dutyRate: 1.5 }));
});

test('landed-cost API is mounted and protected by authentication and role checks', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const route = fs.readFileSync(path.join(__dirname, '..', 'src', 'routes', 'trade-intelligence.routes.js'), 'utf8');
  const server = fs.readFileSync(path.join(__dirname, '..', 'src', 'server.js'), 'utf8');
  assert.ok(route.includes("requireAuth, requireRole('buyer', 'supplier', 'bank', 'admin')"));
  assert.ok(route.includes("router.post('/landed-cost/estimate'"));
  assert.ok(server.includes("app.use('/api/market-intelligence/tools',tradeIntelligenceRoutes)"));
});

test('intelligence centre submits landed-cost estimates and labels VAT as user supplied', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'intelligence-centre.html'), 'utf8');
  assert.ok(html.includes('id="vtgVatRate"'));
  assert.ok(html.includes('/api/market-intelligence/tools/landed-cost/estimate'));
  assert.ok(html.includes("Authorization:'Bearer '+VTG_TOKEN"));
  assert.ok(html.includes('requestServerEstimate()'));
  assert.ok(html.includes('entered tax rates and FX are not independently verified'));
  assert.ok(html.includes('local planning preview remains visible'));
  assert.ok(html.includes('id="vtgProviderStatus"'));
  assert.ok(html.includes("fetch('/api/market-intelligence/tools/contract'"));
  assert.ok(html.includes('No official tariff or live freight integration is confirmed.'));
});

test('buyer dashboard labels provider readiness honestly and checks the authenticated contract endpoint', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'buyer-dashboard.html'), 'utf8');
  assert.ok(html.includes('id="vtgIntelStatus"'));
  assert.ok(html.includes('/api/market-intelligence/tools/contract'));
  assert.ok(html.includes("Authorization:'Bearer '+accessToken"));
  assert.ok(html.includes('Preview mode: provider status has not been verified'));
  assert.ok(html.includes('does not discover the correct duty or tax rate'));
  assert.ok(html.includes('Treat all market inputs as unverified'));
  assert.ok(html.includes("if(v==='intelligence')loadBuyerIntelStatus()"));
});
