const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('reset page handles callbacks itself and verifies the administrator before showing the form', () => {
  const html = read('admin-password-reset.html');
  assert.match(html, /VTG_AUTH_CONFIG=\{detectSessionInUrl:false\}/);
  for (const needle of ['exchangeCodeForSession', 'setSession', "verifyOtp({token_hash:tokenHash,type:'recovery'})", 'auth.getUser()', "profile.role!=='admin'", "account_environment!=='staff'", 'is_active!==true']) {
    assert.ok(html.includes(needle), needle);
  }
  assert.match(html, /updateUser\(\{password\}\)/);
  assert.match(html, /signOut\(\{scope:'global'\}\)/);
  assert.match(html, /\/admin-signin\.html\?passwordReset=success/);
  assert.match(html, /<div class="panel" id="resetPanel">/);
  assert.doesNotMatch(html, /service_role|SERVICE_ROLE/);
});

test('reset page shows useful errors and blocks non-production request origins', () => {
  const html = read('admin-password-reset.html');
  assert.match(html, /expired or was already used/);
  assert.match(html, /different browser or web address/);
  assert.match(html, /ALLOWED_ORIGINS=\['https:\/\/vtg-backended\.vercel\.app'\]/);
});

test('shared auth client lets a page disable URL detection and landing script forwards recovery links', () => {
  assert.match(read('vtg-supabase-auth.js'), /pageConfig\.detectSessionInUrl === false/);
  assert.match(read('vtg-recovery-landing.js'), /admin-password-reset\.html/);
  assert.match(read('frontend-v3.html'), /vtg-recovery-landing\.js/);
  assert.match(read('admin-signin.html'), /passwordReset/);
});
