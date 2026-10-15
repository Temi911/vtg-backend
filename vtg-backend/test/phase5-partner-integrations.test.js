const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const servicePath = path.join(__dirname, '..', 'src', 'services', 'external-integration.service.js');
const paymentsPath = path.join(__dirname, '..', 'src', 'services', 'paymentProviders.js');

function runNode(source, env = {}) {
  return spawnSync(process.execPath, ['-e', source], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
    timeout: 10000,
  });
}

test('partner FX and news integrations report unavailable when no provider endpoint is configured', () => {
  const source = `
    delete process.env.VTG_FX_BASE_URL;
    delete process.env.VTG_NEWS_BASE_URL;
    delete process.env.VTG_FX_PROVIDER;
    delete process.env.VTG_NEWS_PROVIDER;
    const svc = require(${JSON.stringify(servicePath)});
    Promise.all([svc.fxRates(), svc.news(), svc.status()]).then(([fx, news, status]) => {
      process.stdout.write(JSON.stringify({fx, news, status}));
    }).catch(err => { console.error(err); process.exit(1); });
  `;
  const result = runNode(source);
  assert.equal(result.status, 0, result.stderr);
  const value = JSON.parse(result.stdout);
  assert.equal(value.fx.available, false);
  assert.equal(value.fx.provider, 'none');
  assert.equal(value.news.available, false);
  assert.equal(value.news.provider, 'none');
  assert.equal(value.status.providers.fx.configured, false);
  assert.equal(value.status.providers.news.configured, false);
  assert.equal(value.status.providers.vessel.configured, false);
});

test('payment rails are honestly labelled mock by default and never imply live settlement', () => {
  const source = `
    const svc = require(${JSON.stringify(paymentsPath)});
    const status = svc.getProviderStatus();
    if (!status.length || status.some(p => p.mode !== 'mock' || p.configured !== false)) process.exit(2);
    svc.PaymentProviders.tt.initiate({amount: 1, currency: 'USD'}).then(result => {
      if (result.raw.providerMode !== 'mock' || !String(result.raw.note).includes('no real wire transfer')) process.exit(3);
      process.stdout.write('ok');
    }).catch(err => { console.error(err); process.exit(1); });
  `;
  const result = runNode(source, { PAYMENTS_MODE: 'mock' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stdout, 'ok');
});

test('live payment mode fails closed until a real licensed adapter is registered', () => {
  const source = `
    const svc = require(${JSON.stringify(paymentsPath)});
    const status = svc.getProviderStatus();
    if (status.some(p => p.mode !== 'live-unavailable' || p.configured !== false)) process.exit(2);
    svc.PaymentProviders.tt.initiate({amount: 1, currency: 'USD'}).then(() => process.exit(3)).catch(err => {
      if (!/no licensed TT provider adapter is configured/.test(err.message)) process.exit(4);
      process.stdout.write('blocked');
    });
  `;
  const result = runNode(source, { PAYMENTS_MODE: 'live' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stdout, 'blocked');
});
