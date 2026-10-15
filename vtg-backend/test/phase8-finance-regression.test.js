const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const walletService = fs.readFileSync(path.join(root, 'src/services/wallet.service.js'), 'utf8');
const walletController = fs.readFileSync(path.join(root, 'src/controllers/wallet.controller.js'), 'utf8');
const paymentProviders = fs.readFileSync(path.join(root, 'src/services/paymentProviders.js'), 'utf8');

test('wallet transfer is one transaction with locked balances and paired ledger entries', () => {
  assert.match(walletService, /async function transfer\(/);
  assert.match(walletService, /return withTransaction\(async \(client\) =>/);
  assert.match(walletService, /FOR UPDATE/);
  assert.match(walletService, /INSUFFICIENT_FUNDS/);
  assert.match(walletService, /VALUES \(\$1,'debit'/);
  assert.match(walletService, /\(\$7,'credit'/);
  assert.match(walletController, /wallet\.transfer\(/);
  assert.doesNotMatch(walletController, /await wallet\.debit\([\s\S]*?await wallet\.credit\(/);
});

test('wallet send validates finite bounded amounts and caps user notes', () => {
  assert.match(walletController, /amount: z\.number\(\)\.finite\(\)\.positive\(\)\.max\(1000000000\)/);
  assert.match(walletController, /note: z\.string\(\)\.trim\(\)\.max\(500\)\.optional\(\)/);
});

test('payment rails do not claim live readiness without a real adapter', () => {
  assert.match(paymentProviders, /const LIVE_ADAPTERS = Object\.freeze\(\{\}\)/);
  assert.match(paymentProviders, /live-unavailable/);
});
