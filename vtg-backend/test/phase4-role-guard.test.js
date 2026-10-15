const test = require('node:test');
const assert = require('node:assert/strict');
const { requireRole } = require('../src/middleware/auth');

function runGuard(roles, user) {
  let nextError;
  let nextCalls = 0;
  const req = user === undefined ? {} : { user };
  const next = (err) => {
    nextCalls += 1;
    nextError = err;
  };
  requireRole(...roles)(req, {}, next);
  return { nextError, nextCalls };
}

test('role guard fails closed when authentication did not attach a user', () => {
  const result = runGuard(['admin'], undefined);
  assert.equal(result.nextCalls, 1);
  assert.equal(result.nextError.statusCode, 401);
  assert.equal(result.nextError.code, 'UNAUTHENTICATED');
});

test('role guard rejects a signed-in user whose role is not allowed', () => {
  const result = runGuard(['admin'], { id: 'supplier-1', role: 'supplier' });
  assert.equal(result.nextCalls, 1);
  assert.equal(result.nextError.statusCode, 403);
  assert.equal(result.nextError.code, 'FORBIDDEN');
});

test('role guard accepts an allowed role and calls next without an error', () => {
  const result = runGuard(['admin', 'bank'], { id: 'bank-1', role: 'bank' });
  assert.equal(result.nextCalls, 1);
  assert.equal(result.nextError, undefined);
});

test('role guard does not grant access when the role is missing or malformed', () => {
  for (const user of [{ id: 'u-1' }, { id: 'u-2', role: null }, { id: 'u-3', role: 'Admin' }]) {
    const result = runGuard(['admin'], user);
    assert.equal(result.nextCalls, 1);
    assert.equal(result.nextError.statusCode, 403);
    assert.equal(result.nextError.code, 'FORBIDDEN');
  }
});
