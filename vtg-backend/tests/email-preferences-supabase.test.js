'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = (p) => fs.readFileSync(path.join(__dirname, '..', '..', p), 'utf8');

test('unsubscribe tokens are random, hashed, private and time limited', () => {
  const sql = root('supabase/migrations/20261118103633_vtg_email_preferences_unsubscribe_tokens.sql');
  const fn = root('supabase/functions/vtg-email-preferences/index.ts');
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all .* from anon, authenticated/i);
  assert.ok(fn.includes('crypto.subtle.digest("SHA-256"'));
  assert.ok(fn.includes('crypto.getRandomValues'));
  assert.ok(fn.includes('Referrer-Policy'));
  assert.ok(fn.includes('no-referrer'));
  assert.ok(fn.includes('7 * 86400_000'));
});

test('signup consent defaults off and is persisted once', () => {
  const migration = root('supabase/migrations/20261118104103_vtg_email_preferences_consent_and_atomic_unsubscribe.sql');
  assert.ok(migration.includes('marketing_subscribed'));
  assert.ok(migration.toLowerCase().includes('on conflict (user_id) do nothing'));
  assert.ok(migration.includes("coalesce(new.raw_user_meta_data->>'marketing_subscribed','false')"));
});

test('existing Supabase signup consent is backfilled without overwriting choices', () => {
  const migration = root('supabase/migrations/20261118104353_vtg_email_preferences_backfill_auth_metadata.sql');
  assert.ok(migration.includes("raw_user_meta_data->>'marketing_subscribed'"));
  assert.ok(migration.toLowerCase().includes('on conflict (user_id) do nothing'));
});

test('confirmation consumes the token and updates preference atomically', () => {
  const migration = root('supabase/migrations/20261118104103_vtg_email_preferences_consent_and_atomic_unsubscribe.sql');
  const fn = root('supabase/functions/vtg-email-preferences/index.ts');
  assert.ok(migration.toLowerCase().includes('create or replace function public.vtg_consume_email_preference_token'));
  assert.ok(migration.toLowerCase().includes('revoke all on function public.vtg_consume_email_preference_token'));
  assert.ok(fn.includes('admin.rpc("vtg_consume_email_preference_token"'));
});

test('GET confirmation is non-mutating and explicit POST is required', () => {
  const fn = root('supabase/functions/vtg-email-preferences/index.ts');
  assert.ok(fn.includes('if (req.method === "GET"'));
  assert.ok(fn.includes('page("Confirm your preference"'));
  assert.ok(fn.includes('if (req.method === "POST" && url.pathname.endsWith("/confirm"))'));
});

test('onboarding email carries a direct Supabase preference link and gates marketing sends', () => {
  const fn = root('supabase/functions/vtg-email/index.ts');
  const preferences = root('supabase/functions/vtg-email-preferences/index.ts');
  assert.ok(fn.includes('vtg_email_preference_tokens'));
  assert.ok(fn.includes('preferenceUrl = supabaseUrl + "/functions/v1/vtg-email-preferences/confirm?token="'));
  assert.ok(fn.includes('manage your VTG email preferences'));
  assert.ok(fn.includes('MARKETING_OPT_IN_REQUIRED'));
  assert.ok(fn.includes('A working unsubscribe link is required before sending marketing email'));
  assert.ok(preferences.includes('actionUrl = (Deno.env.get("SUPABASE_URL") ?? "") + "/functions/v1/vtg-email-preferences/confirm"'));
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
