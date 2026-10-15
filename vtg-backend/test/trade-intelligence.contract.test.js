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
