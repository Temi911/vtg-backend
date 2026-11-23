const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'supplier-dashboard.html'), 'utf8');

test('supplier dashboard shows business-application approval separately from document verification', () => {
  assert.match(html, /id="applicationBadge"/);
  assert.match(html, /Business application: approved/);
  assert.match(html, /Documents: pending verification/);
  // Only the document verification_status may drive the "verified" styling.
  assert.match(html, /docStatus==='verified'\?'ready':'pending'/);
  assert.doesNotMatch(html, /applicationBadge'\)\.className/);
});
