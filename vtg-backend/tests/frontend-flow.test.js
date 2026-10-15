const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const app = require('../src/server');

const htmlPath = path.join(__dirname, '..', '..', 'frontend-v3.html');
const html = fs.readFileSync(htmlPath, 'utf8');

test('current VTG frontend exposes the core trade interface', () => {
  assert.match(html, /id="newsDrawer"/);
  assert.match(html, /id="mapDrawer"/);
  assert.match(html, /id="authForm"/);
  assert.match(html, /data-role="buyer"/);
  assert.match(html, /data-role="supplier"/);
  assert.match(html, /data-role="bank"/);
});

test('frontend includes calculator, cart, currency conversion and current map/news hooks', () => {
  assert.match(html, /vtg-cart-calculator\.js/);
  assert.match(html, /api\/auth\/send-verification-code/);
  assert.match(html, /vtg-market-news\.js/);
  assert.match(html, /id="mapSearchBtn"/);
});

test('verification-code endpoint fails closed when email delivery is not configured', async () => {
  const smtpKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
  const previousEnv = Object.fromEntries(smtpKeys.map((key) => [key, process.env[key]]));
  smtpKeys.forEach((key) => { delete process.env[key]; });
  const server = app.listen(0);

  try {
    const address = server.address();
    const baseUrl = 'http://127.0.0.1:' + address.port;
    const res = await fetch(baseUrl + '/api/auth/send-verification-code', {
      m¶»§q«^