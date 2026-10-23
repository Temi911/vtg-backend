const test = require('node:test');
const assert = require('node:assert/strict');
const { listMarkets, getMarket, getMarketSummary } = require('../src/services/africa-market.service');

test('Africa market catalogue contains multiple regions with country-specific currencies and time zones', () => {
  const markets = listMarkets();
  assert.ok(markets.length >= 5);
  assert.deepEqual(new Set(markets.map(item => item.region)), new Set(['West Africa', 'East Africa', 'Southern Africa', 'North Africa']));
  for (const market of markets) {
    assert.match(market.countryCode, /^[A-Z]{2}$/);
    assert.match(market.currency.code, /^[A-Z]{3}$/);
    assert.ok(market.timeZone);
    assert.ok(market.locales.length > 0);
  }
});

test('Nigeria includes key ports and other markets are explicitly planned, not falsely live', () => {
  const nigeria = getMarket('ng');
  assert.ok(nigeria.ports.some(port => port.name === 'Tin Can Island Port'));
  assert.ok(nigeria.ports.some(port => port.name === 'Apapa Port'));
  assert.equal(nigeria.marketStatus, 'foundation');
  for (const market of listMarkets().filter(item => item.countryCode !== 'NG')) {
    assert.equal(market.marketStatus, 'planned');
  }
});

test('market data never invents regional representatives or claims live provider feeds', () => {
  const summary = getMarketSummary();
  assert.equal(summary.status, 'planning_data');
  assert.equal(summary.liveProviderData, false);
  for (const market of summary.markets) {
    assert.equal(market.representativeDirectory.status, 'not_configured');
    assert.deepEqual(market.representativeDirectory.entries, []);
    assert.equal(market.compliance.status, 'authority_check_required');
  }
});

test('country lookup validates input and returns isolated market data', () => {
  assert.equal(getMarket('NG;DROP'), null);
  assert.equal(getMarket('123'), null);
  assert.equal(getMarket('ZZ'), null);
  const market = getMarket('NG');
  market.ports.pop();
  assert.ok(getMarket('NG').ports.length >= 5);
});

test('Africa market page is wired to the API and includes safe status and navigation cues', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const page = fs.readFileSync(path.resolve(__dirname, '../../africa-markets.html'), 'utf8');
  const server = fs.readFileSync(path.resolve(__dirname, '../src/server.js'), 'utf8');
  assert.match(page, /fetch\('\/api\/africa\/markets'/);
  assert.match(page, /planning_data/);
  assert.match(page, /liveProviderData!==false/);
  assert.match(page, /marketStatus===\x27foundation\x27/);
  assert.match(page, /vtg-site-navigation\.js/);
  assert.match(page, /id="footAfricaMarkets"|Africa Markets/);
  assert.match(server, /app\.use\('\/api\/africa',africaMarketRoutes\)/);
});
