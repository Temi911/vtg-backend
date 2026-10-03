/**
 * ============================================================
 * PAYMENT PROVIDER INTERFACE
 * ============================================================
 * Every payment rail (LC, T/T, Escrow, Crypto, Forex, D/P) implements
 * this same shape: `initiate(details) -> { status, providerRef, raw }`.
 *
 * Right now every provider below is a MOCK: it simulates a realistic
 * response so the rest of the app (orders, wallets, audit log) has
 * something real to react to. None of them move real money.
 *
 * To go live, replace the body of each `initiate()` with a real call:
 *   - LcProvider      -> your bank's SWIFT/trade-finance API (or manual ops queue)
 *   - TtProvider       -> your bank's wire-transfer API (e.g. GTBank/Zenith corporate API)
 *   - EscrowProvider   -> a licensed escrow partner's API
 *   - CryptoProvider   -> a licensed VASP/exchange API (e.g. for stablecoin settlement)
 *   - ForexProvider    -> a live FX rate feed + your FX desk's execution API
 *   - DpProvider       -> usually manual (bank presents docs, buyer authorises) —
 *                         model as a queue/workflow rather than an external API call
 *
 * The rest of the codebase (controllers/payments.controller.js) only ever
 * talks to `PaymentProviders[method]`, so swapping a mock for a real
 * integration never requires touching route/controller code.
 * ============================================================
 */

const { v4: uuidv4 } = require('uuid');

const PAYMENT_MODE = String(process.env.PAYMENTS_MODE || 'mock').toLowerCase();
const LIVE_ENABLED = PAYMENT_MODE === 'live';

function result(mode, provider, data) {
  return { ...data, raw: { ...(data.raw || {}), provider, providerMode: mode } };
}

function mockResult(provider, data) {
  return result('mock', provider, data);
}

function assertLiveProviderConfigured(method) {
  if (!LIVE_ENABLED) return;
  throw new Error(`Live payment mode is enabled but no licensed ${method.toUpperCase()} provider adapter is configured`);
}

// No live adapters are registered yet. Keep readiness truthful: an environment
// variable alone must never make a rail appear live-capable.
const LIVE_ADAPTERS = Object.freeze({});

function isLiveAdapterReady(method) {
  return typeof LIVE_ADAPTERS[method] === 'function';
}

function mockRef(prefix) {
  return `${prefix}-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
}

const LcProvider = {
  method: 'lc',
  async initiate({ amount, currency, counterpartyName }) {
    assertLiveProviderConfigured('lc');
    return mockResult('lc', {
      status: 'processing',
      providerRef: mockRef('MT700'),
      raw: {
        note: 'MOCK: no real SWIFT message was sent. A bank officer must issue the real MT700 and update this record.',
        amount,
        currency,
        counterpartyName,
      },
    });
  },
};

const TtProvider = {
  method: 'tt',
  async initiate({ amount, currency, counterpartyName }) {
    assertLiveProviderConfigured('tt');
    return mockResult('tt', {
      status: 'processing',
      providerRef: mockRef('WIRE'),
      raw: {
        note: 'MOCK: no real wire transfer was sent. Wire your corporate banking API here.',
        amount,
        currency,
        counterpartyName,
      },
    });
  },
};

const EscrowProvider = {
  method: 'escrow',
  async initiate({ amount, currency, counterpartyName }) {
    assertLiveProviderConfigured('escrow');
    return mockResult('escrow', {
      status: 'pending',
      providerRef: mockRef('ESCROW'),
      raw: {
        note: 'MOCK: no real escrow account was opened. Wire a licensed escrow partner API here.',
        amount,
        currency,
        counterpartyName,
      },
    });
  },
};

const CryptoProvider = {
  method: 'crypto',
  async initiate({ amount, currency, counterpartyName }) {
    assertLiveProviderConfigured('crypto');
    return mockResult('crypto', {
      status: 'pending',
      providerRef: mockRef('CRYPTO'),
      raw: {
        note: 'MOCK: no real on-chain transaction was created. Wire a licensed VASP/exchange API here.',
        amount,
        currency,
        counterpartyName,
      },
    });
  },
};

const ForexProvider = {
  method: 'forex',
  async initiate({ amount, currency, counterpartyName }) {
    assertLiveProviderConfigured('forex');
    return mockResult('forex', {
      status: 'pending',
      providerRef: mockRef('FX'),
      raw: {
        note: 'MOCK: no real FX transaction was executed. The stored forex_rates table is informational only; wire a licensed FX execution API here.',
        amount,
        currency,
        counterpartyName,
      },
    });
  },
};

const DpProvider = {
  method: 'dp',
  async initiate({ amount, currency, counterpartyName }) {
    assertLiveProviderConfigured('dp');
    return mockResult('dp', {
      status: 'pending',
      providerRef: mockRef('DP'),
      raw: {
        note: 'MOCK: D/P is typically a manual bank workflow (docs presented, buyer authorises release), not a single API call. Model this as a task queue for bank staff.',
        amount,
        currency,
        counterpartyName,
      },
    });
  },
};


function providerStatus(method, label) {
  const configured = LIVE_ENABLED && isLiveAdapterReady(method);
  return { method, label, mode: LIVE_ENABLED ? (configured ? 'live-configured' : 'live-unavailable') : 'mock', configured };
}

function getProviderStatus() {
  return [
    providerStatus('tt','Telegraphic Transfer'),
    providerStatus('escrow','Escrow'),
    providerStatus('crypto','Crypto'),
    providerStatus('forex','Forex'),
    providerStatus('dp','Documents Against Payment'),
    providerStatus('lc','Letter of Credit'),
  ];
}

const PaymentProviders = {
  lc: LcProvider,
  tt: TtProvider,
  escrow: EscrowProvider,
  crypto: CryptoProvider,
  forex: ForexProvider,
  dp: DpProvider,
};

module.exports = { PaymentProviders, getProviderStatus };
