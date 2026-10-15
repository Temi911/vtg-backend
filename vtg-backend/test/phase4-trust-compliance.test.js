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
  assert.match(routes, /requireRole\('supplier', 'bank', 'agent'\), upload\.single\('file'\), validateUploadedFile, scanUploadedFile/);
});

test('verification evidence storage is outside the public static root', () => {
  const upload = fs.readFileSync(path.join(root, 'src', 'middleware', 'upload.js'), 'utf8');
  const server = fs.readFileSync(path.join(root, 'src', 'server.js'), 'utf8');
  assert.match(upload, /const STATIC_ROOT = path\.resolve\(__dirname, '\.\.', '\.\.'\)/);
  assert.match(upload, /path\.resolve\(__dirname, '\.\.', '\.\.', '\.\.', 'private-uploads'\)/);
  assert.match(upload, /UPLOAD_DIR\.startsWith\(STATIC_ROOT \+ path\.sep\)/);
  assert.match(upload, /UPLOAD_DIR must be outside the public static web root/);
  assert.match(server, /express\.static\(workspaceRoot/);
});

test('verification history returns reviewer provenance and downloads are audit logged', () => {
  assert.match(verification, /reviewer\.full_name AS reviewer_name/);
  assert.match(verification, /expires_at = CASE WHEN \$1 = 'verified' THEN \$4::timestamptz ELSE NULL END/);
  assert.match(verification, /NOT EXISTS \(SELECT 1 FROM verification_documents vd2 WHERE vd2\.user_id = vd\.user_id AND vd2\.doc_type = vd\.doc_type/);
  assert.match(verification, /newer\.id::text > vd\.id::text/);
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

test('Admin OS exposes accessible trust-risk review controls and calls the protected API', () => {
  const adminHtml = fs.readFileSync(path.join(root, '..', 'admin-os.html'), 'utf8');
  const adminScript = fs.readFileSync(path.join(root, '..', 'admin-trust-risk.js'), 'utf8');
  assert.match(adminHtml, /Trust &amp; Compliance Review/);
  assert.match(adminHtml, /id="trust-risk-form"/);
  assert.match(adminHtml, /id="trust-risk-message" class="trust-risk-message" role="status" aria-live="polite"/);
  assert.match(adminHtml, /admin-trust-risk\.js/);
  assert.match(adminScript, /\/admin\/trust-risk-flags/);
  assert.match(adminScript, /Authorization: 'Bearer '/);
  assert.match(adminScript, /source_reference|sourceReference/);
  assert.match(adminScript, /resolutionNotes/);
  assert.match(adminScript, /not a legal determination/);
});

test('verification evidence expiry and supersession are derived from current evidence', () => {
  const migration = fs.readFileSync(path.join(root, 'src', 'db', 'migrations', '019_verification_expiry.sql'), 'utf8');
  assert.match(migration, /ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ/);
  assert.match(verification, /expires_at IS NOT NULL AND expires_at <= now\(\)/);
  assert.match(verification, /THEN 'superseded'/);
  assert.match(verification, /expiresAt: z\.string\(\)\.datetime\(\)\.optional\(\)/);
  assert.match(verification, /Expiry must be in the future/);
  assert.match(verification, /Only verified evidence can have an expiry date/);
  assert.match(verification, /expires_at = CASE WHEN \$1 = 'verified' THEN \$4::timestamptz ELSE NULL END/);
});

test('verification history escapes stored filenames and notes and shows review provenance', () => {
  const page = fs.readFileSync(path.join(root, '..', 'verification.html'), 'utf8');
  assert.match(page, /esc\(x\.file_name\)/);
  assert.match(page, /esc\(x\.review_notes\)/);
  assert.match(page, /Reviewer /);
  assert.match(page, /Expires /);
  const adminScript = fs.readFileSync(path.join(root, '..', 'admin-verification-centre.js'), 'utf8');
  assert.match(adminScript, /Optional expiry date for this evidence/);
  assert.match(adminScript, /expiresAt\}\)/);
});

test('agent approval requires current verified identity and experience evidence', () => {
  const agent = fs.readFileSync(path.join(root, 'src', 'controllers', 'agent.controller.js'), 'utf8');
  assert.match(agent, /AGENT_EVIDENCE_INCOMPLETE/);
  assert.match(agent, /government_id/);
  assert.match(agent, /proof_of_address/);
  assert.match(agent, /business_registration/);
  assert.match(agent, /professional_certificate/);
  assert.match(agent, /reference_document/);
  assert.match(agent, /expires_at/);
  assert.match(agent, /ORDER BY doc_type,uploaded_at DESC,id::text DESC/);
  assert.match(agent, /A review note of at least five characters is required/);
});


test('verification and Admin OS define explicit light/dark theme tokens and dark status contrast', () => {
  const verificationPage = fs.readFileSync(path.join(root, '..', 'verification.html'), 'utf8');
  const adminPage = fs.readFileSync(path.join(root, '..', 'admin-os.html'), 'utf8');
  assert.match(verificationPage, /:root\{--ink:#0b1720;--muted:#65757e;--line:#dbe5e8;--bg:#f5f8f9;--card:#fff/);
  assert.match(verificationPage, /html\[data-theme="dark"\]\{--ink:#eef3f6;--muted:#b9c5ce;--line:#2b3640;--bg:#0d1117;--card:#11161d/);
  assert.match(verificationPage, /html\[data-theme="dark"\] \.status\{background:#302717;color:#f2c66d\}/);
  assert.match(verificationPage, /html\[data-theme="dark"\] \.status\.verified\{background:#13291f;color:#86efac\}/);
  assert.match(verificationPage, /html\[data-theme="dark"\] \.status\.rejected\{background:#321b1b;color:#ff9999\}/);
  assert.match(adminPage, /:root\{--bg:#f6f8fa;--card:#fff;--ink:#17202a;--muted:#687684;--line:#dfe5ea/);
  assert.match(adminPage, /html\[data-theme=dark\]\{--bg:#0d1117;--card:#11161d;--ink:#eef3f6;--muted:#b9c5ce;--line:#2b3640/);
});
