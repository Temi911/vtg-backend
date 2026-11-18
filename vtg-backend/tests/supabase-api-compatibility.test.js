'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = (file) => fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');

test('legacy API aliases now resolve to Supabase implementations', () => {
  const config = JSON.parse(root('vercel.json'));
  for (const [source, target] of [
    ['/api/auth/me', '/functions/v1/vtg-api/api/auth/me'],
    ['/api/trade/landed-cost', '/functions/v1/vtg-market-intelligence/trade/landed-cost'],
  ]) {
    const index = config.rewrites.findIndex((route) => route.source === source);
    const fallback = config.rewrites.findIndex((route) => route.source === '/api/:path*');
    assert.ok(index >= 0 && index < fallback, 'specific route must precede catch-all: ' + source);
    assert.ok(config.rewrites[index].destination.includes(target));
  }
});

test('auth profile compatibility route validates Supabase session and returns profile metadata', () => {
  const api = root('supabase/functions/vtg-api/index.ts');
  assert.ok(api.includes('segments[0] === "auth" && segments[1] === "me"'));
  assert.ok(api.includes('auth.getUser'));
  assert.ok(api.includes('account_environment'));
  assert.ok(api.includes('preferred_language'));
});

test('public landed-cost compatibility endpoint is input-only and preserves Nigeria-only statutory scope', () => {
  const fn = root('supabase/functions/vtg-market-intelligence/index.ts');
  const route = fn.indexOf('routePath==="trade/landed-cost"');
  const protectedEstimate = fn.indexOf('routePath==="tools/landed-cost/estimate"');
  assert.ok(route >= 0 && protectedEstimate > route);
  for (const part of ['estimatedTotalLandedCost','supported:false','country!=="NG"&&country!=="NIGERIA"','user-supplied assumptions','allowPublicEstimate']) {
    assert.ok(fn.includes(part), 'missing compatibility behaviour: ' + part);
  }
});

test('landing page no longer calls legacy auth or stale market-dashboard routes', () => {
  const home = root('frontend-v3.html');
  const recovery = root('vtg-interaction-recovery.js');
  assert.ok(!home.includes('/api/auth/'));
  assert.ok(!recovery.includes('/api/auth/'));
  assert.ok(!home.includes('/api/market/dashboard'));
  assert.ok(!recovery.includes('/api/market/dashboard'));
  assert.ok(home.includes('/api/market-intelligence/news?limit=20'));
  assert.ok(recovery.includes('/api/market-intelligence/news?limit=20'));
  assert.ok(home.includes('/buyer-signup.html'));
  assert.ok(home.includes('/signin.html?role='));
});
