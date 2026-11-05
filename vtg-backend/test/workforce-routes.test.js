const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const routes = read('src/routes/workforce.routes.js');
const server = read('src/server.js');
const migration = read('src/db/migrations/023_workforce_tasks_handoffs_approvals.sql');
const page = read('../workforce-dashboard.html');

test('workforce API is mounted and every route is authenticated and workforce-role scoped', () => {
  assert.match(server, /app\.use\('\/api\/workforce',\s*workforceRoutes\)/);
  assert.match(server, /require\('\.\/routes\/workforce\.routes'\)/);
  assert.match(routes, /router\.use\(requireAuth,/);
  assert.match(routes, /const WORKFORCE = new Set/);
});

test('workforce migration creates persistent tasks, handoffs and approval records with foreign keys', () => {
  for (const table of ['workforce_tasks', 'workforce_handoffs', 'workforce_approvals']) {
    assert.match(migration, new RegExp('CREATE TABLE IF NOT EXISTS ' + table));
  }
  assert.match(migration, /REFERENCES users\(id\)/);
  assert.match(migration, /CREATE INDEX IF NOT EXISTS workforce_tasks_assigned_status_idx/);
});

test('task assignment, status updates, handoff decisions and approval decisions are audited', () => {
  assert.match(routes, /Workforce Task Created/);
  assert.match(routes, /Workforce Task Status Updated/);
  assert.match(routes, /Workforce Handoff '\+status/);
  assert.match(routes, /Workforce Approval '\+status/);
  assert.match(routes, /withTransaction\(async client/);
});

test('workforce UI uses authenticated API requests rather than localStorage as the record store', () => {
  assert.match(page, /api\('\/tasks/);
  assert.match(page, /api\('\/handoffs/);
  assert.match(page, /api\('\/approvals/);
  assert.match(page, /Authorization:\s*'Bearer '\+token/);
  assert.match(page, /live records are not connected|live records not connected|live task service/i);
});
