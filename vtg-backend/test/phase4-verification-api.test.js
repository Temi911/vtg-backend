const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const privateRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vtg-verification-api-'));
const privateFile = path.join(privateRoot, 'evidence.pdf');
fs.writeFileSync(privateFile, '%PDF-1.7\nprivate test evidence');

let queryImpl = async () => ({ rows: [] });
const queryStub = (...args) => queryImpl(...args);
const auditCalls = [];
const auditStub = { log: async (...args) => { auditCalls.push(args); } };
const notificationsStub = { sendVerificationStatusEmail: async () => true };
const uploadStub = { UPLOAD_DIR: privateRoot };

function stubModule(relativePath, exports) {
  const resolved = require.resolve(relativePath);
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports };
}

stubModule('../src/config/db', { query: queryStub });
stubModule('../src/services/audit.service', auditStub);
stubModule('../src/services/verification-notification.service', notificationsStub);
stubModule('../src/middleware/upload', uploadStub);

const verification = require('../src/controllers/verification.controller');

function invoke(handler, req, res = {}) {
  return new Promise((resolve) => {
    const response = {
      setHeader: (name, value) => { (response.headers ||= {})[name] = value; },
      download: (filePath, name) => { response.downloaded = { filePath, name }; resolve({ res: response }); },
      json: (body) => { response.body = body; resolve({ res: response }); },
      status: (code) => { response.statusCode = code; return response; },
      ...res,
    };
    handler(req, response, (error) => resolve({ error, res: response }));
  });
}

test('verification download denies a different account before exposing file or audit event', async () => {
  auditCalls.length = 0;
  queryImpl = async () => ({ rows: [{
    id: 'doc-1', user_id: 'owner-1', role: 'supplier',
    file_path: 'evidence.pdf', file_name: 'company-proof.pdf', doc_type: 'company_registration'
  }] });
  const result = await invoke(verification.download, {
    params: { id: 'doc-1' }, user: { id: 'other-user', role: 'supplier' }, ip: '127.0.0.1'
  });
  assert.equal(result.error.statusCode, 403);
  assert.equal(result.error.code, 'FORBIDDEN');
  assert.equal(result.res.downloaded, undefined);
  assert.equal(auditCalls.length, 0);
});

test('verification download allows the owner and disables browser caching', async () => {
  auditCalls.length = 0;
  queryImpl = async () => ({ rows: [{
    id: 'doc-2', user_id: 'owner-1', role: 'supplier',
    file_path: 'evidence.pdf', file_name: 'company-proof.pdf', doc_type: 'company_registration'
  }] });
  const result = await invoke(verification.download, {
    params: { id: 'doc-2' }, user: { id: 'owner-1', role: 'supplier' }, ip: '127.0.0.1'
  });
  assert.equal(result.error, undefined);
  assert.equal(result.res.downloaded.filePath, privateFile);
  assert.equal(result.res.downloaded.name, 'company-proof.pdf');
  assert.equal(result.res.headers['Cache-Control'], 'private, no-store, max-age=0');
  assert.equal(result.res.headers['Pragma'], 'no-cache');
  assert.equal(result.res.headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(auditCalls.length, 1);
});

test('verification download allows admin review access but rejects a path escaping private storage', async () => {
  auditCalls.length = 0;
  queryImpl = async () => ({ rows: [{
    id: 'doc-3', user_id: 'owner-1', role: 'supplier',
    file_path: '../../public/secret.txt', file_name: 'secret.txt', doc_type: 'company_registration'
  }] });
  const result = await invoke(verification.download, {
    params: { id: 'doc-3' }, user: { id: 'admin-1', role: 'admin' }, ip: '127.0.0.1'
  });
  assert.equal(result.error.statusCode, 404);
  assert.equal(result.error.code, 'DOCUMENT_NOT_FOUND');
  assert.equal(result.res.downloaded, undefined);
  assert.equal(auditCalls.length, 0);
});

test('verification review cannot update a document unless it is pending and current', async () => {
  queryImpl = async (sql) => {
    if (sql.includes('UPDATE verification_documents')) return { rows: [] };
    throw new Error('Unexpected database query in stale-document test');
  };
  const result = await invoke(verification.review, {
    params: { id: 'superseded-doc' },
    user: { id: 'admin-1', role: 'admin' },
    body: { status: 'verified' },
    ip: '127.0.0.1'
  });
  assert.equal(result.error.statusCode, 404);
  assert.equal(auditCalls.length, 0);
});


test('invalid document type removes the Multer file before returning an error', async () => {
  auditCalls.length = 0;
  const unownedFile = path.join(privateRoot, 'invalid-type-upload.pdf');
  fs.writeFileSync(unownedFile, '%PDF-1.7');
  queryImpl = async () => { throw new Error('database should not be queried for an invalid type'); };
  const result = await invoke(verification.upload, {
    user: { id: 'supplier-1', role: 'supplier' },
    body: { docType: 'bank_license' },
    file: { path: unownedFile, filename: 'opaque.pdf', originalname: 'not-allowed.pdf', mimetype: 'application/pdf', size: 8 },
    ip: '127.0.0.1'
  });
  assert.equal(result.error.code, 'INVALID_DOCUMENT_TYPE');
  assert.equal(fs.existsSync(unownedFile), false);
});

test('database insert failure removes the upload file that has no owning row', async () => {
  auditCalls.length = 0;
  const orphanCandidate = path.join(privateRoot, 'db-failure-upload.pdf');
  fs.writeFileSync(orphanCandidate, '%PDF-1.7');
  queryImpl = async (sql) => {
    if (sql.includes('SELECT business_verification_status')) return { rows: [{ business_verification_status: 'pending' }] };
    if (sql.includes('INSERT INTO verification_documents')) throw new Error('simulated insert failure');
    throw new Error('Unexpected database query in upload cleanup test');
  };
  const result = await invoke(verification.upload, {
    user: { id: 'supplier-1', role: 'supplier' },
    body: { docType: 'company_registration' },
    file: { path: orphanCandidate, filename: 'opaque.pdf', originalname: 'company.pdf', mimetype: 'application/pdf', size: 8 },
    ip: '127.0.0.1'
  });
  assert.match(result.error.message, /simulated insert failure/);
  assert.equal(fs.existsSync(orphanCandidate), false);
});
