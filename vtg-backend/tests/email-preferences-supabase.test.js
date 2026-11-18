import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

test('unsubscribe tokens are random, hashed, private and time limited', () => {
  const sql = root('supabase/migrations/20261118103633_vtg_email_preferences_unsubscribe_tokens.sql');
  const fn = root('supabase/functions/vtg-email-preferences/index.ts');
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all .* from anon, authenticated/i);
  assert.match(fn, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(fn, /crypto\.getRandomValues/);
  assert.match(fn, /7 \* 86400_000/);
});

test('signup consent defaults off and is persisted once', () => {
  const migration = root('supabase/migrations/20261118104103_vtg_email_preferences_consent_and_atomic_unsubscribe.sql');
  assert.match(migration, /marketing_subscribed/);
  assert.match(migration, /on conflict \(user_id\) do nothing/i);
  assert.match(migration, /coalesce\(new\.raw_user_meta_data->>'marketing_subscribed','false'\)/i);
});

test('confirmation consumes the token and updates preference atomically', () => {
  const migration = root('supabase/migrations/20261118104103_vtg_email_preferences_consent_and_atomic_unsubscribe.sql');
  const fn = root('supabase/functions/vtg-email-preferences/index.ts');
  assert.match(migration, /create or replace function public\.vtg_consume_email_preference_token/i);
  assert.match(migration, /revoke all on function public\.vtg_consume_email_preference_token/i);
  assert.match(fn, /admin\.rpc\("vtg_consume_email_preference_token"/);
});

test('GET confirmation is non-mutating and explicit POST is required', () => {
  const fn = root('supabase/functions/vtg-email-preferences/index.ts');
  assert.match(fn, /if \(req\.method === "GET"\).*?return html\(page\("Confirm your preference"/s);
  assert.match(fn, /if \(req\.method === "POST" && url\.pathname\.endsWith\("\/confirm"\)\)/);
});

test('onboarding email carries the new Supabase preference link', () => {
  const fn = root('supabase/functions/vtg-email/index.ts');
  assert.match(fn, /vtg_email_preference_tokens/);
  assert.match(fn, /preferenceUrl = appUrl \+ "\/api\/auth\/email-preferences\//);
  assert.match(fn, /manage your VTG email preferences/);
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
