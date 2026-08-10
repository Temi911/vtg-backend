const test = require('node:test');
const assert = require('node:assert/strict');
process.env.NODE_ENV = 'development';
const app = require('../src/server');

function getRandomPort() {
  return 0;
}

test('login works with the local development database fallback when PostgreSQL is unavailable', async () => {
  const server = app.listen(getRandomPort());
  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const res = await fetch(`${baseUrl}/api/auth/login`, {
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
