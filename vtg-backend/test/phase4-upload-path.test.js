const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

const backendRoot = path.resolve(__dirname, '..');
const middlewarePath = path.join(backendRoot, 'src', 'middleware', 'upload.js');

test('upload middleware rejects a directory inside the Express static root at runtime', () => {
  const unsafePath = path.join(backendRoot, 'public-test-uploads');
  const result = spawnSync(process.execPath, ['-e', 'require(' + JSON.stringify(middlewarePath) + ')'], {
    encoding: 'utf8',
    env: { ...process.env, UPLOAD_DIR: unsafePath },
  });
  assert.notEqual(result.status, 0, 'unsafe upload directory must fail closed');
  assert.match(result.stderr, /UPLOAD_DIR must be outside the public static web root/);
  assert.equal(fs.existsSync(unsafePath), false, 'unsafe path must not be created');
});

test('upload middleware accepts a private directory outside the Express static root', () => {
  const privatePath = fs.mkdtempSync(path.join(os.tmpdir(), 'vtg-private-uploads-'));
  try {
    const script = 'const m=require(' + JSON.stringify(middlewarePath) + '); if(m.UPLOAD_DIR!==' + JSON.stringify(privatePath) + ') process.exit(3);';
    const result = spawnSync(process.execPath, ['-e', script], {
      encoding: 'utf8',
      env: { ...process.env, UPLOAD_DIR: privatePath },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  } finally {
    fs.rmSync(privatePath, { recursive: true, force: true });
  }
});
