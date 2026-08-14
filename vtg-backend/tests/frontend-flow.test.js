const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const app = require('../src/server');

const htmlPath = path.join(__dirname, '..', '..', 'frontend-v3.html');
const html = fs.readFileSync(htmlPath, 'utf8');

test('current VTG frontend exposes the core trade interface', () => {
  assert.match(html, /id="newsBtn"/);
  assert.match(html, /id="mapBtn"/);
  assert.match(html, /id="aiLaunch"/);
  assert.match(html, /id="authForm"/);
  assert.match(html, /data-role="buyer"/);
  assert.match(html, /data-role="supplier"/);
  assert.match(html, /data-role="bank"/);
});

test('frontend includes trade calculator, cart and currency conversion hooks', () => {
  assert.match(html, /vtg-commerce\.js/);
  assert.match(html, /api\/auth\/send-verification-code/);
  assert.match(html, /vtg-market-news\.js/);
  assert.match(html, /map-enhancer\.js/);
});

test('verification-code endpoint returns a clear delivery status payload', async () => {
  const server = app.listen(0);
  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const res = await fetch(`${baseUrl}/api/auth/send-verification-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'buyer@example.com' }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.email, 'buyer@example.com');
    assert.equal(body.code.length, 6);
    assert.equal(body.deliveryMode, 'local-log');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('verification code helper switches to SMTP delivery when configured', async () => {
  process.env.SMTP_HOST = 'smtp.example.com';
  process.env.SMTP_PORT = '587';
  process.env.SMTP_SECURE = 'false';
  process.env.SMTP_USER = 'mailer@example.com';
  process.env.SMTP_PASS = 'secret';
  process.env.SMTP_FROM = 'vtg@example.com';

  const authControllerPath = require.resolve('../src/controllers/auth.controller');
  delete require.cache[authControllerPath];
  const authController = require('../src/controllers/auth.controller');

  try {
    const result = await authController.issueEmailVerificationCode('buyer@example.com');
    assert.equal(result.deliveryMode, 'smtp');
    assert.equal(result.code.length, 6);
  } finally {
    delete require.cache[authControllerPath];
  }
});
