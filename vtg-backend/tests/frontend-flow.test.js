const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const app = require('../src/server');

const htmlPath = path.join(__dirname, '..', '..', 'vtg-live-19-DEMO_1.html');
const html = fs.readFileSync(htmlPath, 'utf8');

test('login and buyer signup screens include country selection and Chinese translations', () => {
  assert.match(html, /id="login-country-select"/);
  assert.match(html, /id="buyer-signup-country-select"/);
  assert.match(html, /data-i18n="welcomeBack"/);
  assert.match(html, /data-i18n="buyerRegistrationTitle"/);
  assert.match(html, /buyerRegistrationTitle: '买家注册'/);
});

test('signup flow exposes an email verification step', () => {
  assert.match(html, /sendVerificationCode/i);
  assert.match(html, /verification code/i);
  assert.match(html, /Verify Email/i);
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
