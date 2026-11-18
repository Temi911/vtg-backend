'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = (file) => fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');

test('Market Intelligence tools and trade statistics route to Supabase before the API catch-all', () => {
  const config = JSON.parse(root('vercel.json'));
  const expected = new Map([
    ['/api/market-intelligence/tools/contract', 'vtg-market-intelligence/tools/contract'],
    ['/api/market-intelligence/tools/landed-cost/estimate', 'vtg-market-intelligence/tools/landed-cost/estimate'],
    ['/api/market-intelligence/trade', 'vtg-market-intelligence/trade'],
  ]);
  for (const [source, target] of expected) {
    const index = config.rewrites.findIndex((route) => route.source === source);
    const fallbackIndex = config.rewrites.findIndex((route) => route.source === '/api/:path*');
    assert.ok(index >= 0, 'missing rewrite: ' + source);
    assert.ok(index < fallbackIndex, 'specific rewrite must precede API catch-all: ' + source);
    assert.ok(config.rewrites[index].destination.includes(target));
  }
});

test('Market Intelligence Edge Function protects tools and statistics with active trade roles', () => {
  const fn = root('supabase/functions/vtg-market-intelligence/index.ts');
  assert.match(fn, /async function getTradeUser/);
  assert.match(fn, /\["buyer","supplier","bank","admin"\]/);
  assert.match(fn, /routePath==="tools\/contract"/);
  assert.match(fn, /routePath==="tools\/landed-cost\/estimate"/);
  assert.match(fn, /routePath==="trade"/);
  assert.match(fn, /auth\.getUser\(token\)/);
  assert.match(fn, /profile\.data\?\.is_active!==true/);
  assert.match(fn, /landedCostEstimate\(body\)/);
  assert.match(fn, /UN Comtrade public preview/);
  assert.doesNotMatch(fn, /SUPABASE_SERVICE_ROLE_KEY|service_role/i);
});

test('Landed cost remains an indicative user-input calculation and does not invent tariff rates', () => {
  const fn = root('supabase/functions/vtg-market-intelligence/index.ts');
  assert.match(fn, /status:"indicative"/);
  assert.match(fn, /does not determine legally applicable tariff rates/);
  assert.match(fn, /not a customs valuation, binding tariff ruling/);
  assert.match(fn, /dutyRate<0\|\|dutyRate>1/);
});

test('Market Intelligence news uses a fast RSS primary source and rejects stale feed items', () => {
  const fn = root('supabase/functions/vtg-market-intelligence/index.ts');
  assert.ok(fn.includes('news.google.com/rss/search'));
  assert.ok(fn.includes('when:7d'));
  assert.ok(fn.includes('7*24*60*60*1000'));
  assert.ok(fn.includes('loadGdeltNews'));
});
