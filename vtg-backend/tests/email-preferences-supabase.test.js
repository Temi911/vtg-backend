import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

test('unsubscribe token storage is private and hashed', () => {
  const sql = root('supabase/migrations/20261118120000_vtg_email_preferences_unsubscribe_tokens.sql');
  const fn = root('supabase/functions/vtg-email-preferences/index.ts');
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all .* from anon, authenticated/i);
  assert.match(fn, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(fn, /crypto\.getRandomValues/);
});

test('GET confirmation is non-mutating and explicit POST is required', () => {
  const fn = root('supabase/functions/vtg-email-preferences/index.ts');
  assert.match(fn, /if \(req\.method === "GET"\).*?return html\(page\("Confirm your preference"/s);
  assert.match(fn, /if \(req\.method === "POST" && url\.pathname\.endsWith\("\/confirm"\)\)/);
});

test('preference endpoints route to Supabase before catch-all', () => {
  const config = JSON.parse(root('vercel.json'));
  const routes = config.rewrites;
  const issue = routes.findIndex((r) => r.source === '/api/auth/email-preferences');
  const confirm = routes.findIndex((r) => r.source === '/api/auth/email-preferences/confirm');
  const token = routes.findIndex((r) => r.source === '/api/auth/email-preferences/:token');
  const catchAll = routes.findIndex((r) => r.source === '/api/:path*');
  assert.ok(issue >= 0 && confirm >= 0 && token >= 0);
  assert.ok(issue < catchAll && confirm < catchAll && token < catchAll);
});
