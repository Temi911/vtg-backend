const { z } = require('zod');
const { query } = require('../config/db');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');
const { PaymentProviders } = require('../services/paymentProviders');
const audit = require('../services/audit.service');

const initiateSchema = z.object({
  method: z.enum(['tt', 'escrow', 'crypto', 'forex', 'dp']),
  orderId: z.string().uuid().optional(),
  amount: z.number().positive(),
  currency: z.enum(['USD', 'NGN', 'CNY']),
  counterpartyName: z.string().optional(),
});

// POST /payments — initiate a payment via any non-LC rail
const initiate = asyncHandler(async (req, res) => {
  const data = initiateSchema.parse(req.body);
  const provider = PaymentProviders[data.method];
  if (!provider) throw new AppError('Unsupported payment method', 400);

  const result = await provider.initiate({
    amount: data.amount,
    currency: data.currency,
    counterpartyName: data.counterpartyName,
  });

  const { rows } = await query(
    `INSERT INTO payment_requests (order_id, initiated_by, method, amount, currency, status, counterparty_name, provider_ref, raw_response)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [
      data.orderId || null,
      req.user.id,
      data.method,
      data.amount,
      data.currency,
      result.status,
      data.counterpartyName || null,
      result.providerRef,
      result.raw,
    ]
  );

  await audit.log(req.user.id, 'Payment Initiated', `${data.method.toUpperCase()} — ${data.amount} ${data.currency} (${result.providerRef})`, req.ip);
  res.status(201).json({ paymentRequest: rows[0] });
});

const listMine = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM payment_requests WHERE initiated_by = $1 ORDER BY created_at DESC', [req.user.id]);
  res.json({ paymentRequests: rows });
});

// GET /payments/forex-rates
const forexRates = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT base_currency, quote_currency, rate, updated_at FROM forex_rates');
  res.json({ rates: rows });
});

const convertSchema = z.object({
  amount: z.number().positive(),
  from: z.enum(['USD', 'NGN', 'CNY']),
  to: z.enum(['USD', 'NGN', 'CNY']),
});

// POST /payments/forex/convert
const convert = asyncHandler(async (req, res) => {
  const { amount, from, to } = convertSchema.parse(req.body);
  if (from === to) return res.json({ amount, rate: 1, result: amount });

  const { rows } = await query('SELECT rate FROM forex_rates WHERE base_currency = $1 AND quote_currency = $2', [from, to]);
  if (!rows[0]) throw new AppError(`No rate available for ${from} -> ${to}`, 404);

  const rate = Number(rows[0].rate);
  res.json({ amount, rate, result: Number((amount * rate).toFixed(2)) });
});

// GET /payments/compliance — country crypto/forex compliance table
const compliance = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT country_name, country_code, crypto_allowed, forex_allowed, notes FROM country_compliance ORDER BY country_name');
  res.json({ compliance: rows });
});

module.exports = { initiate, listMine, forexRates, convert, compliance };
