'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = (file) => fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');

test('Africa Markets API is explicitly routed to the Supabase catch-all implementation', () => {
  const config = JSON.parse(root('vercel.json'));
  const index = config.rewrites.findIndex((route) => route.source === '/api/africa/markets');
  const fallback = config.rewrites.findIndex((route) => route.source === '/api/:path*');
  assert.ok(index >= 0 && index < fallback);
  assert.ok(config.rewrites[index].destination.includes('/functions/v1/vtg-api/api/africa/markets'));
});

test('Supabase Africa Markets response preserves planning-only contract and country lookup', () => {
  const fn = root('supabase/functions/vtg-api/index.ts');
  for (const fragment of ['AFRICA_MARKETS','planning_data','liveProviderData:false','marketCount:markets.length','MARKET_NOT_FOUND','representativeDirectory']) {
    assert.ok(fn.includes(fragment), 'missing Africa Markets contract field: ' + fragment);
  }
  assert.ok(fn.includes('segments[0] === "africa" && segments[1] === "markets"'));
  assert.ok(fn.indexOf('segments[0] === "africa"') < fn.indexOf('const { data: authData'), 'public catalogue must not require sign-in');
});
