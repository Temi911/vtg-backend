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

test('verification upload checks declared file types before recording evidence', () => {
  const upload = fs.readFileSync(path.join(root, 'src', 'middleware', 'upload.js'), 'utf8');
  assert.match(upload, /crypto\.randomUUID\(\)/);
  assert.match(upload, /hasValidSignature/);
  assert.match(upload, /FILE_SIGNATURE_MISMATCH/);
  assert.match(upload, /fileSize: 10 \* 1024 \* 1024/);
  assert.match(routes, /requireRole\('supplier', 'bank', 'agent'\), upload\.single\('file'\), validateUploadedFile/);
});

test('verification history returns reviewer provenance and downloads are audit logged', () => {
  assert.match(verification, /reviewer\.full_name AS reviewer_name/);
  assert.match(verification, /vd\.reviewer_id, vd\.reviewed_at/);
  assert.match(verification, /Verification Document Downloaded/);
});

test('file signature checks reject extension or MIME spoofing', () => {
  const { hasValidSignature } = require('../src/middleware/upload');
  assert.equal(hasValidSignature('application/pdf', Buffer.from('%PDF-1.7')), true);
  assert.equal(hasValidSignature('image/png', Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])), true);
  assert.equal(hasValidSignature('image/jpeg', Buffer.from([0xff,0xd8,0xff,0x00])), true);
  assert.equal(hasValidSignature('image/webp', Buffer.from('RIFF0000WEBP')), true);
  assert.equal(hasValidSignature('application/pdf', Buffer.from('<html>not a pdf')), false);
  assert.equal(hasValidSignature('image/png', Buffer.from('not a png')), false);
});

test('trust risk flags require source, rationale and explicit resolution provenance', () => {
  const migration = fs.readFileSync(path.join(root, 'src', 'db', 'migrations', '018_trust_risk_flags.sql'), 'utf8');
  const controller = fs.readFileSync(path.join(root, 'src', 'controllers', 'trust-risk.controller.js'), 'utf8');
  const riskRoutes = fs.readFileSync(path.join(root, 'src', 'routes', 'trust-risk.routes.js'), 'utf8');
  const server = fs.readFileSync(path.join(root, 'src', 'server.js'), 'utf8');
  assert.match(migration, /source_type TEXT NOT NULL/);
  assert.match(migration, /rationale TEXT NOT NULL/);
  assert.match(migration, /resolved_by UUID REFERENCES users\(id\)/);
  assert.match(migration, /resolved_at TIMESTAMPTZ/);
  assert.match(controller, /Resolution notes of at least five characters are required/);
  assert.match(controller, /Trust Risk Flag Created/);
  assert.match(controller, /Trust Risk Flag Updated/);
  assert.match(riskRoutes, /router\.use\(requireAuth, requireRole\('admin'\)\)/);
  assert.match(server, /app\.use\('\/api\/admin\/trust-risk-flags',trustRiskRoutes\)/);
});
