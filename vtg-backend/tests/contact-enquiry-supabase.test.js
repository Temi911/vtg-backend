'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = (file) => fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');

test('public contact enquiries route to the private Supabase intake function', () => {
  const config = JSON.parse(root('vercel.json'));
  for (const [source, target] of [
    ['/api/contact/admin', 'vtg-contact-enquiries/admin'],
    ['/api/contact', 'vtg-contact-enquiries'],
  ]) {
    const index = config.rewrites.findIndex((route) => route.source === source);
    const fallback = config.rewrites.findIndex((route) => route.source === '/api/:path*');
    assert.ok(index >= 0 && index < fallback, 'specific contact route must precede catch-all: ' + source);
    assert.ok(config.rewrites[index].destination.includes(target));
  }
  const page = root('contact.html');
  assert.ok(page.includes('fetch("/api/contact"'));
  assert.ok(page.includes('id="consent"'));
  assert.ok(page.includes('name="website"'));
  assert.ok(!page.includes('window.location.href="mailto:'));
});

test('contact enquiry storage is private and protected', () => {
  const migration = root('supabase/migrations/20261118100336_create_vtg_contact_enquiries.sql');
  const fn = root('supabase/functions/vtg-contact-enquiries/index.ts');
  assert.ok(migration.includes('ENABLE ROW LEVEL SECURITY'));
  assert.ok(migration.includes('REVOKE ALL ON TABLE public.vtg_contact_enquiries FROM public, anon, authenticated'));
  assert.ok(migration.includes('GRANT ALL ON TABLE public.vtg_contact_enquiries TO service_role'));
  for (const part of ['vtg_contact_enquiries','source_ip_hash','crypto.subtle.digest','RESEND_API_KEY','website','ADMIN_FORBIDDEN']) {
    assert.ok(fn.includes(part), 'missing contact protection or persistence: ' + part);
  }
  assert.ok(fn.includes('account_environment'));
  assert.ok(!root('contact.html').includes('SUPABASE_SERVICE_ROLE_KEY'));
});
