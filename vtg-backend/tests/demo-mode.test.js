const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'development';
process.env.ENABLE_DEMO_AUTH = 'true';
process.env.DEMO_BUYER_PASSWORD = 'Password123';

const app = require('../src/server');

test('demo buyer login works with the local database fallback when demo auth is explicitly enabled', async () => {
  const server = app.listen(0);
  try {
    const address = server.address();
    const baseUrl = 'http://127.0.0.1:' + address.port;

    const res = await fetch(baseUrl + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'buyer@demo.vtg', password: 'Password123' }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.user.email, 'buyer@demo.vtg');
    assert.equal(body.user.role, 'buyer');
    assert.ok(body.accessToken);
    assert.ok(body.refreshToken);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
