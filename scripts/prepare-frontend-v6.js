const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const encoded = path.join(root, 'frontend-v6.html.gz.b64');
const output = path.join(root, 'frontend-v6.html');
const expectedSha256 = '6eb28e9a119b93b051ba4795cae5b2372493acde30af3001d305e23a2d79fd3b';
try {
  const compressed = Buffer.from(fs.readFileSync(encoded, 'utf8').trim(), 'base64');
  const html = zlib.gunzipSync(compressed);
  const actual = crypto.createHash('sha256').update(html).digest('hex');
  if (actual !== expectedSha256) throw new Error(`bundle checksum mismatch: expected ${expectedSha256}, got ${actual}`);
  fs.writeFileSync(output, html);
  console.log('[VTG frontend v6] generated and verified frontend-v6.html');
} catch (error) {
  console.error('[VTG frontend v6] ' + error.message);
  process.exit(1);
}
