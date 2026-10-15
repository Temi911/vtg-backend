const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const servicePath = path.join(__dirname, '..', 'src', 'services', 'external-integration.service.js');

function runNode(source, env = {}) {
  return spawnSync(process.execPath, ['-e', source], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
    timeout: 15000,
  });
}

test('FX rejects invalid currency input and limits normalized symbols', () => {
  const source = `
    const svc = require(${JSON.stringify(servicePath)});
    Promise.all([
      svc.fxRates('US$', ['NGN']),
      svc.fxRates('USD', ['not-a-currency', ''])
    ]).then(([base, symbols]) => {
      process.stdout.write(JSON.stringify({base, symbols}));
    }).catch(() => process.exit(1));
  `;
  const result = runNode(source);
  assert.equal(result.status, 0, result.stderr);
  const value = JSON.parse(result.stdout);
  assert.equal(value.base.status, 'invalid_request');
  assert.equal(value.symbols.status, 'invalid_request');
});

test('FX provider rejects malformed JSON shapes and never marks retrieval time as source freshness', () => {
  const source = `
    const http = require('node:http');
    const server = http.createServer((req, res) => {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ rates: { NGN: 'not-a-rate' } }));
    });
    server.listen(0, '127.0.0.1', async () => {
      process.env.VTG_FX_BASE_URL = 'http://127.0.0.1:' + server.address().port + '/rates';
      process.env.VTG_FX_PROVIDER = 'test-fixture';
      const svc = require(${JSON.stringify(servicePath)});
      const bad = await svc.fxRates('USD', ['NGN']);
      server.close(() => process.stdout.write(JSON.stringify({bad})));
    });
  `;
  const result = runNode(source, { VTG_INTEGRATION_TIMEOUT_MS: '1500' });
  assert.equal(result.status, 0, result.stderr);
  const value = JSON.parse(result.stdout);
  assert.equal(value.bad.available, false);
  assert.equal(value.bad.status, 'error');
});

test('valid FX response exposes retrieval time separately from unknown source freshness', () => {
  const source = `
    const http = require('node:http');
    const server = http.createServer((req, res) => {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ base: 'USD', rates: { NGN: 1500.25 } }));
    });
    server.listen(0, '127.0.0.1', async () => {
      process.env.VTG_FX_BASE_URL = 'http://127.0.0.1:' + server.address().port + '/rates';
      process.env.VTG_FX_PROVIDER = 'test-fixture';
      const svc = require(${JSON.stringify(servicePath)});
      const result = await svc.fxRates('USD', ['NGN']);
      const status = await svc.status();
      server.close(() => process.stdout.write(JSON.stringify({result, status})));
    });
  `;
  const result = runNode(source, { VTG_INTEGRATION_TIMEOUT_MS: '1500' });
  assert.equal(result.status, 0, result.stderr);
  const value = JSON.parse(result.stdout);
  assert.equal(value.result.available, true);
  assert.equal(value.result.rates.NGN, 1500.25);
  assert.ok(value.result.retrievedAt);
  assert.equal(value.result.freshness, 'unknown');
  assert.equal(value.status.providers.fx.health, 'not_checked');
  assert.ok(value.status.providers.fx.lastSuccessAt);
});
