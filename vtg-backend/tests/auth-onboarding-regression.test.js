const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const controllerPath = path.join(__dirname, '..', 'src', 'controllers', 'auth.controller.js');
const middlewarePath = path.join(__dirname, '..', 'src', 'middleware', 'auth.js');
const signinPath = path.join(__dirname, '..', '..', 'signin.html');
const marketplaceControllerPath = path.join(__dirname, '..', 'src', 'controllers', 'marketplace.controller.js');
const accountSupportPath = path.join(__dirname, '..', 'src', 'controllers', 'account-support.controller.js');
const readSource = relativePath => fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
const controller = fs.readFileSync(controllerPath, 'utf8');
const middleware = fs.readFileSync(middlewarePath, 'utf8');
const signin = fs.readFileSync(signinPath, 'utf8');

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

test('sign-in exposes agent access and routes each role to the appropriate workspace', () => {
  assert.match(signin, /data-role="agent"/);
  assert.match(signin, /location\.href='\/agent-dashboard\.html'/);
  assert.match(signin, /location\.href='\/verification\.html'/);
  assert.match(signin, /role==='agent'\?'\/agent\.html'/);
});

test('marketplace controller parses successfully so the API can boot', () => {
  const result = spawnSync(process.execPath, ['--check', marketplaceControllerPath], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout || 'marketplace controller syntax check failed');
});


test('account support accepts the agent role and normalizes the reply-to email', () => {
  const supportController = fs.readFileSync(accountSupportPath, 'utf8');
  assert.match(supportController, /z\.enum\(\['buyer','supplier','bank','agent','admin'\]\)/);
  assert.match(supportController, /const email = parsed\.data\.email\.toLowerCase\(\)/);
});


test('admin and agent API routes enforce server-side role guards', () => {
  const adminRoutes = readSource('src/routes/admin.routes.js');
  const agentRoutes = readSource('src/routes/agent.routes.js');
  assert.match(adminRoutes, /router\.use\(requireAuth,\s*requireRole\('admin'\)\)/);
  assert.match(agentRoutes, /requireRole\('agent'\)/);
  assert.match(agentRoutes, /requireRole\('admin'\)/);
});

test('document and conversation APIs enforce authentication and record-level access', () => {
  const documentRoutes = readSource('src/routes/documents.routes.js');
  const documentController = readSource('src/controllers/documents.controller.js');
  const messageRoutes = readSource('src/routes/messages.routes.js');
  const messageController = readSource('src/controllers/messages.controller.js');
  assert.match(documentRoutes, /router\.get\('\/:id\/download',\s*requireAuth/);
  assert.match(documentController, /getDocumentAccess/);
  assert.match(documentController, /You do not have access to this document/);
  assert.match(messageRoutes, /router\.post\('\/:conversationId\/messages',\s*requireAuth/);
  assert.match(messageController, /assertParticipant\(req\.params\.conversationId, req\.user\.id\)/);
});

test('order and product mutations check participant or supplier ownership', () => {
  const orderController = readSource('src/controllers/orders.controller.js');
  const productController = readSource('src/controllers/products.controller.js');
  assert.match(orderController, /You do not have access to this order/);
  assert.match(orderController, /Only the supplier can advance this order to this milestone/);
  assert.match(productController, /existing\.rows\[0\]\.supplier_id !== req\.user\.id/);
});
