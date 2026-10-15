const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const clientSource = fs.readFileSync(path.join(__dirname, '..', '..', 'vtg-auth-session.js'), 'utf8');
const ORIGIN = 'https://vtg.test';

function jwt(payload) {
  return 'header.' + Buffer.from(JSON.stringify(payload)).toString('base64url') + '.signature';
}

function makeLocks() {
  let tail = Promise.resolve();
  return {
    request(_name, callback) {
      const prior = tail;
      let release;
      tail = new Promise((resolve) => { release = resolve; });
      return prior.then(async () => {
        try { return await callback(); } finally { release(); }
      });
    }
  };
}

function browserRequestClass() {
  return class BrowserRequest extends Request {
    constructor(input, init) {
      if (typeof input === 'string' || input instanceof URL) {
        super(new URL(String(input), ORIGIN), init);
      } else {
        super(input, init);
      }
    }
  };
}

function createBrowser(nativeFetch, options = {}) {
  const values = new Map();
  const auth = options.auth || {
    user: { id: 'user-1', role: 'buyer' },
    accessToken: options.accessToken || jwt({ id: 'user-1', sid: 'session-1', role: 'buyer', iat: 1 }),
    refreshToken: options.refreshToken || 'refresh-old'
  };
  values.set('vtg-auth', JSON.stringify(auth));
  values.set('vtg_access_token', auth.accessToken);

  const storage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
  const BrowserRequest = browserRequestClass();
  const dispatch = async (input, init) => nativeFetch(input instanceof BrowserRequest ? input : new BrowserRequest(input, init));
  const win = {
    fetch: dispatch,
    localStorage: storage,
    location: { origin: ORIGIN, href: ORIGIN + '/page.html' },
    navigator: options.locks === false ? {} : { locks: makeLocks() },
    atob(value) { return Buffer.from(value, 'base64').toString('binary'); }
  };
  vm.runInNewContext(clientSource, {
    window: win,
    Request: BrowserRequest,
    Headers,
    Response,
    URL,
    Promise,
    JSON,
    Object,
    Array,
    String,
    Boolean,
    RegExp,
    Error,
    decodeURIComponent
  }, { filename: 'vtg-auth-session.js' });
  return { window: win, storage, values };
}

test('refreshes a rejected authenticated request, retries once, and stores rotated tokens', async () => {
  const oldAccess = jwt({ id: 'user-1', sid: 'session-1', role: 'buyer', iat: 1 });
  const newAccess = jwt({ id: 'user-1', sid: 'session-1', role: 'buyer', iat: 2 });
  const apiAttempts = [];
  let submittedRefreshToken = null;
  const browser = createBrowser(async (request) => {
    const url = new URL(request.url);
    if (url.pathname === '/api/auth/refresh') {
      submittedRefreshToken = (await request.json()).refreshToken;
      return new Response(JSON.stringify({ accessToken: newAccess, refreshToken: 'refresh-new' }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }
    if (url.pathname === '/api/orders') {
      apiAttempts.push({
        authorization: request.headers.get('Authorization'),
        body: await request.clone().text()
      });
      return new Response('{}', { status: request.headers.get('Authorization') === 'Bearer ' + newAccess ? 200 : 401 });
    }
    return new Response('not found', { status: 404 });
  }, { accessToken: oldAccess });

  const response = await browser.window.fetch('/api/orders', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + oldAccess, 'Content-Type': 'application/json' },
    body: JSON.stringify({ order: 'VTG-1' })
  });

  assert.equal(response.status, 200);
  assert.equal(submittedRefreshToken, 'refresh-old');
  assert.equal(apiAttempts.length, 2);
  assert.equal(apiAttempts[0].authorization, 'Bearer ' + oldAccess);
  assert.equal(apiAttempts[1].authorization, 'Bearer ' + newAccess);
  assert.equal(apiAttempts[0].body, apiAttempts[1].body);
  assert.equal(JSON.parse(apiAttempts[1].body).order, 'VTG-1');
  assert.equal(browser.storage.getItem('vtg_access_token'), newAccess);
  assert.equal(JSON.parse(browser.storage.getItem('vtg-auth')).refreshToken, 'refresh-new');
});

test('serializes concurrent refreshes through the same-origin lock', async () => {
  const oldAccess = jwt({ id: 'user-1', sid: 'session-1', role: 'buyer', iat: 1 });
  const newAccess = jwt({ id: 'user-1', sid: 'session-1', role: 'buyer', iat: 2 });
  let refreshCount = 0;
  const browser = createBrowser(async (request) => {
    const url = new URL(request.url);
    if (url.pathname === '/api/auth/refresh') {
      refreshCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 15));
      return new Response(JSON.stringify({ accessToken: newAccess, refreshToken: 'refresh-new' }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response('{}', { status: request.headers.get('Authorization') === 'Bearer ' + newAccess ? 200 : 401 });
  }, { accessToken: oldAccess });

  const responses = await Promise.all([
    browser.window.fetch('/api/one', { headers: { Authorization: 'Bearer ' + oldAccess } }),
    browser.window.fetch('/api/two', { headers: { Authorization: 'Bearer ' + oldAccess } })
  ]);
  assert.deepEqual(responses.map((response) => response.status), [200, 200]);
  assert.equal(refreshCount, 1);
});

test('coalesces parallel refreshes in one tab when Web Locks are unavailable', async () => {
  const oldAccess = jwt({ id: 'user-1', sid: 'session-1', role: 'buyer', iat: 1 });
  const newAccess = jwt({ id: 'user-1', sid: 'session-1', role: 'buyer', iat: 2 });
  let refreshCount = 0;
  const browser = createBrowser(async (request) => {
    const url = new URL(request.url);
    if (url.pathname === '/api/auth/refresh') {
      refreshCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 15));
      return new Response(JSON.stringify({ accessToken: newAccess, refreshToken: 'refresh-new' }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response('{}', { status: request.headers.get('Authorization') === 'Bearer ' + newAccess ? 200 : 401 });
  }, { accessToken: oldAccess, locks: false });

  const responses = await Promise.all([
    browser.window.fetch('/api/one', { headers: { Authorization: 'Bearer ' + oldAccess } }),
    browser.window.fetch('/api/two', { headers: { Authorization: 'Bearer ' + oldAccess } })
  ]);
  assert.deepEqual(responses.map((response) => response.status), [200, 200]);
  assert.equal(refreshCount, 1);
});

test('does not refresh the auth logout endpoint or cross-origin API calls', async () => {
  let refreshCount = 0;
  const browser = createBrowser(async (request) => {
    if (new URL(request.url).pathname === '/api/auth/refresh') refreshCount += 1;
    return new Response('{}', { status: 401 });
  });

  const logout = await browser.window.fetch('/api/auth/logout', {
    method: 'POST', headers: { Authorization: 'Bearer expired-access' }
  });
  const external = await browser.window.fetch('https://api.example.test/api/private', {
    headers: { Authorization: 'Bearer expired-access' }
  });
  assert.equal(logout.status, 401);
  assert.equal(external.status, 401);
  assert.equal(refreshCount, 0);
});

test('clears only the rejected session after refresh returns unauthorized', async () => {
  const browser = createBrowser(async (request) => {
    if (new URL(request.url).pathname === '/api/auth/refresh') return new Response('{}', { status: 401 });
    return new Response('{}', { status: 401 });
  });
  const response = await browser.window.fetch('/api/orders', {
    headers: { Authorization: 'Bearer ' + JSON.parse(browser.storage.getItem('vtg-auth')).accessToken }
  });
  assert.equal(response.status, 401);
  assert.equal(browser.storage.getItem('vtg_access_token'), null);
  assert.equal(browser.storage.getItem('vtg-auth'), null);
});

test('preserves a newer signed-in session when an older refresh fails', async () => {
  const oldAccess = jwt({ id: 'user-1', sid: 'session-1', role: 'buyer', iat: 1 });
  const newAccess = jwt({ id: 'user-2', sid: 'session-2', role: 'supplier', iat: 2 });
  let browser;
  browser = createBrowser(async (request) => {
    if (new URL(request.url).pathname === '/api/auth/refresh') {
      browser.storage.setItem('vtg-auth', JSON.stringify({
        user: { id: 'user-2', role: 'supplier' },
        accessToken: newAccess,
        refreshToken: 'refresh-user-2'
      }));
      browser.storage.setItem('vtg_access_token', newAccess);
      return new Response('{}', { status: 401 });
    }
    return new Response('{}', { status: 401 });
  }, { accessToken: oldAccess });

  await browser.window.fetch('/api/orders', { headers: { Authorization: 'Bearer ' + oldAccess } });
  assert.equal(browser.storage.getItem('vtg_access_token'), newAccess);
  assert.equal(JSON.parse(browser.storage.getItem('vtg-auth')).refreshToken, 'refresh-user-2');
});
