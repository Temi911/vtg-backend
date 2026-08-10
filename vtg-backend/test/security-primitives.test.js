const test = require('node:test');
const assert = require('node:assert/strict');

const { buildStorageKey } = require('../src/services/document-storage');

test('storage key strips path traversal from original filename', () => {
  const key = buildStorageKey({
    userId: 'user-1',
    orderId: 'order-1',
    originalName: '../../secret.pdf',
  });
  assert.match(key, /^documents\/order\/order-1\/user-1\//);
  assert.doesNotMatch(key, /\.\.\//);
});

test('storage key is scoped to the owning user and order', () => {
  const key = buildStorageKey({
    userId: 'user-123',
    orderId: 'order-456',
    originalName: 'invoice.pdf',
  });
  assert.match(key, /^documents\/order\/order-456\/user-123\//);
  assert.match(key, /invoice\.pdf$/);
});

test('LC document keys are scoped to the LC', () => {
  const key = buildStorageKey({
    userId: 'user-123',
    lcId: 'lc-789',
    originalName: 'lc.pdf',
  });
  assert.match(key, /^documents\/lc\/lc-789\/user-123\//);
});
