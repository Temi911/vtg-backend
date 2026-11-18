'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = (file) => fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');

test('account preference endpoints route to Supabase before the API catch-all', () => {
  const config = JSON.parse(root('vercel.json'));
  for (const [source, target] of [
    ['/api/preferences', '/functions/v1/vtg-api/api/preferences'],
    ['/api/preferences/language', '/functions/v1/vtg-api/api/preferences/language'],
  ]) {
    const index = config.rewrites.findIndex((route) => route.source === source);
    const fallback = config.rewrites.findIndex((route) => route.source === '/api/:path*');
    assert.ok(index >= 0 && index < fallback, 'specific route must precede catch-all: ' + source);
    assert.ok(config.rewrites[index].destination.endsWith(target));
  }
});

test('preferences API is authenticated and scoped to the signed-in profile', () => {
  const api = root('supabase/functions/vtg-api/index.ts');
  const auth = api.indexOf('const { data: authData, error: authError }');
  const get = api.indexOf('segments[0] === "preferences" && req.method === "GET"');
  const patch = api.indexOf('segments[0] === "preferences" && segments[1] === "language" && req.method === "PATCH"');
  assert.ok(auth >= 0 && get > auth && patch > get);
  assert.ok(api.includes('.eq("id", user.id).maybeSingle()'));
  assert.ok(api.includes('.eq("id", user.id).select("preferred_language")'));
  for (const language of ['"en"', '"fr"', '"pt"', '"ar"', '"sw"', '"zh"', '"ko"', '"es"']) assert.ok(api.includes(language));
  assert.ok(api.includes('Choose a supported language'));
});

test('email preference token routes target the Supabase preference function', () => {
  const config = JSON.parse(root('vercel.json'));
  const routes = config.rewrites;
  const issue = routes.findIndex((route) => route.source === '/api/auth/email-preferences');
  const confirm = routes.findIndex((route) => route.source === '/api/auth/email-preferences/confirm');
  const token = routes.findIndex((route) => route.source === '/api/auth/email-preferences/:token');
  const fallback = routes.findIndex((route) => route.source === '/api/:path*');
  assert.ok(issue >= 0 && confirm >= 0 && token >= 0);
  assert.ok(issue < fallback && confirm < fallback && token < fallback);
  assert.ok(routes[confirm].destination.includes('/functions/v1/vtg-email-preferences/confirm'));
  assert.ok(routes[token].destination.includes('/functions/v1/vtg-email-preferences/confirm'));
});
