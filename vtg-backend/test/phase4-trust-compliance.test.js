const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const verification = fs.readFileSync(path.join(root, 'src', 'controllers', 'verification.controller.js'), 'utf8');
const routes = fs.readFileSync(path.join(root, 'src', 'routes', 'verification.routes.js'), 'utf8');

test('verification document downloads are restricted to owner or admin', () => {
  assert.match(verification, /req\.user\.role !== 'admin' && req\.user\.id !== doc\.user_id/);
  assert.match(routes, /router\.get\('\/documents\/:id\/download', requireAuth, ctrl\.download\)/);
});

test('verification document paths are confined to the private upload directory', () => {
  assert.match(verification, /const uploadRoot = path\.resolve\(UPLOAD_DIR\)/);
  assert.match(verification, /const absoluteFile = path\.resolve\(uploadRoot, doc\.file_path\)/);
  assert.match(verification, /absoluteFile\.startsWith\(uploadRoot \+ path\.sep\)/);
  assert.match(verification, /DOCUMENT_NOT_FOUND/);
});

test('sensitive verification document downloads disable caching and MIME sniffing', () => {
  assert.match(verification, /Cache-Control', 'private, no-store, max-age=0/);
  assert.match(verification, /Pragma', 'no-cache/);
  assert.match(verification, /X-Content-Type-Options', 'nosniff/);
});

test('only admins can review verification documents and rejection requires a note', () => {
  assert.match(routes, /router\.patch\('\/documents\/:id\/review', requireAuth, requireRole\('admin'\), ctrl\.review\)/);
  assert.match(verification, /status: z\.enum\(\['verified','rejected'\]\)/);
  assert.match(verification, /A review note is required when rejecting a document/);
});

test('verification review queue exposes only pending documents for supplier, bank and agent accounts', () => {
  assert.match(verification, /WHERE vd\.status = 'pending' AND u\.role IN \('supplier','bank','agent'\)/);
  assert.match(verification, /Business Verification Reviewed/);
});
