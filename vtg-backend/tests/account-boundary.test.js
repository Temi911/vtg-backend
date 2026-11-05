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

test('public auth refuses private staff identities', () => {
  const auth = read('../vtg-supabase-auth.js');
  assert.match(auth, /accountEnvironment === 'staff'/);
  assert.match(auth, /signInWorkforce/);
  assert.match(auth, /signInAdmin/);
  assert.match(auth, /Public trade accounts cannot use workforce sign-in/);
});

test('staff entry pages are noindex and independent of public navigation', () => {
  for (const file of ['../workforce-access.html', '../workforce-signin.html', '../admin-signin.html', '../agent.html', '../workforce-accept.html']) {
    const page = read(file);
    assert.match(page, /name="robots" content="noindex/i);
    assert.doesNotMatch(page, /vtg-shell\.js|id="vsHeader"|id="vsFooter"|frontend-v3\.html/i);
  }
});

test('staff dashboards use Supabase account and membership checks', () => {
  const pages = ['../workforce-dashboard.html', '../admin-dashboard-preview.html', '../agent-dashboard.html', '../agent-network-dashboard.html'];
  for (const file of pages) {
    const page = read(file);
    assert.match(page, /name="robots" content="noindex/i);
    assert.match(page, /vtg-supabase-auth\.js/);
    assert.doesNotMatch(page, /\/api\/auth\/me|vtg-dashboard-footer\.js|frontend-v3\.html/i);
  }
  assert.match(read('../workforce-dashboard.html'), /workforceMemberships/);
  assert.match(read('../agent-dashboard.html'), /workspace_role==="agent"/);
  assert.match(read('../admin-dashboard-preview.html'), /staffInviteForm/);
});

test('staff invitations are admin-gated and acceptance is bound to a one-time token', () => {
  const edge = read('../supabase/functions/workforce-invitations/index.ts');
  assert.match(edge, /profile\.role !== "admin"/);
  assert.match(edge, /auth\.admin\.inviteUserByEmail/);
  assert.match(edge, /p_token_hash/);
  assert.match(edge, /parts\[0\] === "accept"/);
  assert.match(edge, /\["active", "suspended", "removed"\]/);
  assert.match(edge, /\["active", "suspended", "removed"\]/);
});

test('Agent cannot be requested or approved through public trade role applications', () => {
  const migration = read('../supabase/migrations/20261105113000_vtg_make_agent_access_staff_only.sql');
  assert.match(migration, /requested_role IN \('supplier'::public\.vtg_account_role,'bank'::public\.vtg_account_role\)/);
  assert.match(migration, /Internal staff roles are invitation-only/);
  assert.doesNotMatch(migration, /ELSIF req\.requested_role='agent'/);
});

test('public agent application is replaced with a staff-only access notice', () => {
  const agent = read('../agent.html');
  assert.match(agent, /authorised VTG personnel/i);
  assert.doesNotMatch(agent, /<form|Create account|Register as an agent/i);
});
