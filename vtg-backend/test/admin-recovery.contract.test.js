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
  assert.match(html, /\/workforce-access\.html\?passwordReset=success/);
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
  
});

test('staff access is email-link only: private page, server-side eligibility, no public sign-in links', () => {
  const page = read('workforce-access.html');
  assert.match(page, /vtg-staff-access/);
  assert.match(page, /VTG_AUTH_CONFIG=\{detectSessionInUrl:false\}/);
  assert.doesNotMatch(page, /href=["'][^"']*(admin-signin|workforce-signin)/);
  const fn = read('supabase/functions/vtg-staff-access/index.ts');
  assert.match(fn, /account_environment === "staff" && d\.is_active === true/);
  assert.match(fn, /shouldCreateUser: false/);
  assert.match(fn, /NEUTRAL_STAFF/);
  assert.doesNotMatch(fn, /service_role|SERVICE_ROLE_KEY\)\)/);
  for (const f of ['admin-dashboard.html', 'workforce-dashboard.html', 'admin-role-requests.html']) {
    assert.doesNotMatch(read(f), /location\.replace\(["']\/(admin|workforce)-signin/, f);
  }
});

test('public help page offers buyer, supplier and bank only and verifies before sending', () => {
  const help = read('account-help.html');
  assert.doesNotMatch(help, /data-role="admin"/);
  assert.match(help, /kind:'user'/);
  assert.match(help, /full_name/);
  assert.match(help, /vtg-password-toggle\.js/);
  for (const f of ['buyer-dashboard.html', 'supplier-dashboard.html', 'bank-trade-os.html']) assert.match(read(f), /vtg-login-change\.js/, f);
  assert.match(read('vtg-login-change.js'), /kind:'self'/);
});
