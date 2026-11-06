'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const readRoot = (file) => fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');

test('account support inbox is private and only the server function can write requests', () => {
  const migration = readRoot('supabase/migrations/20261106110000_vtg_account_support_inbox.sql');
  const fn = readRoot('supabase/functions/vtg-account-support/index.ts');
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration, /REVOKE ALL ON public\.vtg_account_support_requests FROM anon, authenticated/i);
  assert.match(migration, /GRANT ALL ON public\.vtg_account_support_requests TO service_role/i);
  assert.match(fn, /auth\.getUser/); // no account token is required for account-help; do not add an accidental auth gate
  assert.match(fn, /vtg_account_support_requests/);
  assert.match(fn, /password|verification code/i);
  assert.match(fn, /Too many requests/);
});

test('account help uses Supabase Auth for password recovery and signup verification', () => {
  const page = readRoot('account-help.html');
  assert.match(page, /resetPasswordForEmail/);
  assert.match(page, /auth\.updateUser/);
  assert.match(page, /auth\.resend/);
  assert.match(page, /functions\.invoke\('vtg-account-support'/);
  assert.doesNotMatch(page, /fetch\('\/api\/auth\/(forgot-password|reset-password|send-verification-code|account-support)/);
});

test('inspection staff APIs are routed to the authenticated Supabase workflow', () => {
  const config = JSON.parse(readRoot('vercel.json'));
  const agent = config.rewrites.find(x => x.source === '/api/agent/:path*');
  const queue = config.rewrites.find(x => x.source === '/api/inspections/requests/agent');
  assert.match(agent.destination, /supabase\.co\/functions\/v1\/vtg-inspection-workflow\/agent/);
  assert.match(queue.destination, /supabase\.co\/functions\/v1\/vtg-inspection-workflow\/requests\/agent/);
  const page = readRoot('agent-dashboard.html');
  assert.match(page, /uploadToSignedUrl/);
  assert.match(page, /vtg-inspection-workflow/);
  assert.doesNotMatch(page, /fetch\('\/api\/inspections\/requests\/'\+id\+'\/evidence'/);
});

test('inspection workflow scopes inspector queue and evidence to assigned workforce members', () => {
  const fn = readRoot('supabase/functions/vtg-inspection-workflow/index.ts');
  assert.match(fn, /profile\.account_environment===\"staff\"/);
  assert.match(fn, /workspace_role===\"agent\"/);
  assert.match(fn, /\.eq\("inspector_id",user\.id\)/);
  assert.match(fn, /Active inspector workspace membership required/);
  assert.match(fn, /evidence-upload/);
  assert.match(fn, /Uploaded evidence object was not found/);
});
