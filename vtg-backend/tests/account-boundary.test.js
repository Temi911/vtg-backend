'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('public API exposes only the three public trade signup routes', () => {
  const routes = read('src/routes/auth.routes.js');
  assert.match(routes, /signup\/buyer/);
  assert.match(routes, /signup\/supplier/);
  assert.match(routes, /signup\/bank/);
  assert.doesNotMatch(routes, /signup\/agent/);
});

test('public signup page presents only buyer, supplier and bank accounts', () => {
  const signup = read('../signup.html');
  for (const role of ['buyer', 'supplier', 'bank']) assert.match(signup, new RegExp(role + '-signup\\.html'));
  assert.doesNotMatch(signup, /agent|workforce|administrator/i);
});

test('public sign-in presents only buyer, supplier and bank roles', () => {
  const signin = read('../signin.html');
  for (const role of ['buyer', 'supplier', 'bank']) assert.match(signin, new RegExp('data-role="' + role + '"'));
  assert.doesNotMatch(signin, /data-role="agent"|data-role="admin"|workforce/i);
});

test('staff entry pages are noindex and independent of public navigation', () => {
  for (const file of ['../workforce-access.html', '../workforce-signin.html', '../admin-signin.html', '../agent.html']) {
    const page = read(file);
    assert.match(page, /name="robots" content="noindex/i);
    assert.doesNotMatch(page, /vtg-shell\.js|id="vsHeader"|id="vsFooter"|frontend-v3\.html/i);
  }
});

test('staff dashboards require authenticated role checks and disable public previews', () => {
  const pages = ['../workforce-dashboard.html', '../admin-dashboard-preview.html', '../agent-dashboard.html', '../agent-network-dashboard.html'];
  for (const file of pages) {
    const page = read(file);
    assert.match(page, /name="robots" content="noindex/i);
    assert.match(page, /\/api\/auth\/me/);
    assert.doesNotMatch(page, /vtg-dashboard-footer\.js|frontend-v3\.html/i);
  }
  assert.match(read('../workforce-dashboard.html'), /preview=false/);
  assert.match(read('../agent-dashboard.html'), /preview=false/);
});

test('public agent application is replaced with a staff-only access notice', () => {
  const agent = read('../agent.html');
  assert.match(agent, /authorised VTG personnel/i);
  assert.doesNotMatch(agent, /<form|Create account|Register as an agent/i);
});
