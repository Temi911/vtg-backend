const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const inspection = fs.readFileSync(path.join(root, 'src/controllers/inspection.controller.js'), 'utf8');
const routes = fs.readFileSync(path.join(root, 'src/routes/inspection.routes.js'), 'utf8');
const agentRoutes = fs.readFileSync(path.join(root, 'src/routes/agent.routes.js'), 'utf8');

test('inspection quote accepts an order ID so ownership and eligibility checks can execute', () => {
  const quoteStart = inspection.indexOf('const quote=asyncHandler');
  const createStart = inspection.indexOf('const createRequest=', quoteStart);
  assert.notEqual(quoteStart, -1, 'quote handler exists');
  assert.notEqual(createStart, -1, 'request creation handler exists');
  const quoteHandler = inspection.slice(quoteStart, createStart);
  assert.match(quoteHandler, /orderId:z\.string\(\)\.uuid\(\)\.optional\(\)/);
  assert.match(quoteHandler, /if\(d\.orderId\)/);
  assert.match(quoteHandler, /ORDER_ACCESS_DENIED/);
  assert.match(quoteHandler, /ORDER_NOT_ELIGIBLE/);
});

test('inspection evidence and assignment endpoints require the appropriate roles', () => {
  assert.match(routes, /post\('\/requests',requireAuth,requireRole\('buyer'\)/);
  assert.match(routes, /post\('\/requests\/:id\/evidence',requireAuth,requireRole\('agent'\)/);
  assert.match(routes, /upload\.single\('file'\),validateUploadedFile,scanUploadedFile,c\.uploadEvidence/);
  assert.match(routes, /patch\('\/admin\/requests\/:id\/assign',requireAuth,requireRole\('admin'\)/);
  assert.match(routes, /get\('\/admin\/queue',requireAuth,requireRole\('admin'\)/);
});

test('agent profile review is restricted to admins and agent workspace to agents', () => {
  assert.match(agentRoutes, /get\('\/me',requireAuth,requireRole\('agent'\)/);
  assert.match(agentRoutes, /patch\('\/admin\/:id\/status',requireAuth,requireRole\('admin'\)/);
});

test('evidence listing enforces inspection membership and payout requires buyer approval', () => {
  assert.match(inspection, /buyer_id=\$2 OR assigned_agent_id=\$2 OR \$3='admin'/);
  assert.match(inspection, /Inspection not found or access denied\./);
  assert.match(inspection, /path\.basename\(String\(e\.file_path\|\|''\)\)/);
  assert.match(inspection, /eligible\[0\]\.status!=='approved'\|\|eligible\[0\]\.buyer_decision!=='approved'/);
  assert.match(inspection, /A payment reference is required when marking a payout paid\./);
  assert.match(inspection, /Inspection Agent Payout Updated/);
});
