const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const controllerPath = path.join(__dirname, '..', 'src', 'controllers', 'auth.controller.js');
const middlewarePath = path.join(__dirname, '..', 'src', 'middleware', 'auth.js');
const controller = fs.readFileSync(controllerPath, 'utf8');
const middleware = fs.readFileSync(middlewarePath, 'utf8');

test('agent signup persists the generated VTG ID and marketing preferences', () => {
  assert.match(controller, /INSERT INTO users \(email, phone, password_hash, role, full_name, preferred_language, is_verified, vtg_user_id, marketing_subscribed, marketing_unsubscribe_token\)/);
  assert.match(controller, /VALUES \(\$1,\$2,\$3,'agent',\$4,\$5,TRUE,\$6,\$7,\$8\)/);
});

test('signup and login normalize email addresses before database lookup', () => {
  assert.match(controller, /email: z\.string\(\)\.email\(\)\.transform\(normalizeEmail\)/);
  assert.match(controller, /function normalizeEmail\(email\) \{ return String\(email \|\| ''\)\.trim\(\)\.toLowerCase\(\); \}/);
});

test('supplier and buyer registration retain server-side geographic restrictions', () => {
  assert.match(controller, /phoneCountry: allowedCountry\(VTG_AFRICA_COUNTRIES/);
  assert.match(controller, /phoneCountry: allowedCountry\(VTG_SUPPLIER_COUNTRIES/);
  assert.match(controller, /country: z\.enum\(\['China','South Korea'\]\)/);
});

test('protected workspace routes require acceptance of the current agreement', () => {
  assert.match(middleware, /user_agreements WHERE user_id=\$1 AND agreement_version=\$2/);
  assert.match(middleware, /AGREEMENT_REQUIRED/);
});
