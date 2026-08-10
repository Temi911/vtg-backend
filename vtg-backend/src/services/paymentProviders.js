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

function mockRef(prefix) {
  return `${prefix}-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
}

const LcProvider = {
  method: 'lc',
  async initiate({ amount, currency, counterpartyName }) {
    return {
      status: 'processing',
      providerRef: mockRef('MT700'),
      raw: {
        note: 'MOCK: no real SWIFT message was sent. A bank officer must issue the real MT700 and update this record.',
        amount,
        currency,
        counterpartyName,
      },
    };
  },
};

const TtProvider = {
  method: 'tt',
  async initiate({ amount, currency, counterpartyName }) {
    return {
      status: 'processing',
      providerRef: mockRef('WIRE'),
      raw: {
        note: 'MOCK: no real wire transfer was sent. Wire your corporate banking API here.',
        amount,
        currency,
        counterpartyName,
      },
    };
  },
};

const EscrowProvider = {
  method: 'escrow',
  async initiate({ amount, currency, counterpartyName }) {
    return {
      status: 'pending',
      providerRef: mockRef('ESCROW'),
      raw: {
        note: 'MOCK: no real escrow account was opened. Wire a licensed escrow partner API here.',
        amount,
        currency,
        counterpartyName,
      },
    };
  },
};

const CryptoProvider = {
  method: 'crypto',
  async initiate({ amount, currency, counterpartyName }) {
    return {
      status: 'pending',
      providerRef: mockRef('CRYPTO'),
      raw: {
        note: 'MOCK: no real on-chain transaction was created. Wire a licensed VASP/exchange API here.',
        amount,
        currency,
        counterpartyName,
      },
    };
  },
};

const ForexProvider = {
  method: 'forex',
  async initiate({ amount, currency, counterpartyName }) {
    return {
      status: 'completed',
      providerRef: mockRef('FX'),
      raw: {
        note: 'MOCK: settled instantly using the stored forex_rates table. Wire a live FX execution API here.',
        amount,
        currency,
        counterpartyName,
      },
    };
  },
};

const DpProvider = {
  method: 'dp',
  async initiate({ amount, currency, counterpartyName }) {
    return {
      status: 'pending',
      providerRef: mockRef('DP'),
      raw: {
        note: 'MOCK: D/P is typically a manual bank workflow (docs presented, buyer authorises release), not a single API call. Model this as a task queue for bank staff.',
        amount,
        currency,
        counterpartyName,
      },
    };
  },
};

const PaymentProviders = {
  lc: LcProvider,
  tt: TtProvider,
  escrow: EscrowProvider,
  crypto: CryptoProvider,
  forex: ForexProvider,
  dp: DpProvider,
};

module.exports = { PaymentProviders };
