const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const app = require('../src/server');

const htmlPath = path.join(__dirname, '..', '..', 'marketplace.html');
const html = fs.readFileSync(htmlPath, 'utf8');

test('current VTG marketplace exposes product discovery and supplier listings', () => {
  assert.match(html, /VTG Marketplace — Products & Suppliers/);
  assert.match(html, /id="search"/);
  assert.match(html, /id="category"/);
  assert.match(html, /id="products"/);
  assert.match(html, /id="count"/);
});

test('marketplace includes quote request workflow and current site navigation assets', () => {
  assert.match(html, /id="quoteModal"/);
  assert.match(html, /id="quoteForm"/);
  assert.match(html, /id="quoteQty"/);
  assert.match(html, /vtg-visual-product-search\.js/);
  assert.match(html, /vtg-site-navigation\.js/);
});

test('verification-code endpoint fails closed when email delivery is not configured', async () => {
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.SMTP_FROM;
  const server = app.listen(0);
  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const res = await fetch(`${baseUrl}/api/auth/send-verification-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'buyer@example.com' }),
    });
    assert.equal(res.status, 502);
    const body = await res.json();
    assert.equal(body.error.code, 'EMAIL_DELIVERY_FAILED');
    assert.equal(body.code, undefined);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('verification code helper reports success only after the mail provider accepts the message', async () => {
  process.env.SMTP_HOST = 'smtp.example.com';
  process.env.SMTP_PORT = '587';
  process.env.SMTP_SECURE = 'false';
  process.env.SMTP_USER = 'mailer@example.com';
  process.env.SMTP_PASS = 'test-only-password';
  process.env.SMTP_FROM = 'vtg@example.com';

  const nodemailer = require('nodemailer');
  const originalCreateTransport = nodemailer.createTransport;
  nodemailer.createTransport = () => ({ sendMail: async () => ({ messageId: 'test-message' }) });
  const authControllerPath = require.resolve('../src/controllers/auth.controller');
  delete require.cache[authControllerPath];
  const authController = require('../src/controllers/auth.controller');

  try {
    const result = await authController.issueEmailVerificationCode('buyer@example.com');
    assert.equal(result.sent, true);
    assert.equal(result.code, undefined);
  } finally {
    nodemailer.createTransport = originalCreateTransport;
    delete require.cache[authControllerPath];
  }
});
