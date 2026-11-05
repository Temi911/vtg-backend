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

test('staff access pages are noindex and do not load the public shell', () => {
  for (const file of ['../workforce-access.html', '../workforce-signin.html', '../admin-signin.html']) {
    const page = read(file);
    assert.match(page, /name="robots" content="noindex/i);
    assert.doesNotMatch(page, /vtg-shell\.js|id="vsHeader"|id="vsFooter"/i);
  }
});
