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

  if (data.orderId) {
    const { rows: orderRows } = await query(
      'SELECT id, buyer_id, supplier_id, status, total_amount_usd, currency FROM orders WHERE id = $1',
      [data.orderId]
    );
    const order = orderRows[0];
    if (!order) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    if (order.buyer_id !== req.user.id) throw new AppError('Only the buyer for this order can initiate its payment', 403, 'FORBIDDEN');
    if (['cancelled', 'delivered'].includes(order.status)) {
      throw new AppError('Payments cannot be initiated for a cancelled or completed order', 409, 'ORDER_NOT_PAYABLE');
    }
    if (data.currency !== order.currency) {
      throw new AppError('Payment currency must match the order currency (' + order.currency + ')', 422, 'CURRENCY_MISMATCH');
    }
    if (data.currency === 'USD' && data.amount > Number(order.total_amount_usd)) {
      throw new AppError('Payment amount cannot exceed the order total', 422, 'AMOUNT_EXCEEDS_ORDER');
    }
    const { rows: activePayments } = await query(
      `SELECT id, method, amount, currency, status, provider_ref
       FROM payment_requests
       WHERE order_id = $1 AND status IN ('pending','processing')`,
      [data.orderId]
    );
    const activeTotal = activePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const orderTotal = Number(order.total_amount_usd);
    if (activePayments.some(p => p.method === data.method && p.currency === data.currency)) {
      throw new AppError('An active payment request already exists for this order and payment method', 409, 'DUPLICATE_ACTIVE_PAYMENT');
    }
    if (data.currency === 'USD' && activeTotal + data.amount > orderTotal) {
      throw new AppError('Active payment requests plus this payment cannot exceed the order total', 422, 'PAYMENT_TOTAL_EXCEEDS_ORDER');
    }
    const { rows: duplicateRows } = await query(
      `SELECT id, provider_ref, status FROM payment_requests
       WHERE order_id = $1 AND initiated_by = $2 AND method = $3
         AND currency = $4 AND amount = $5 AND status IN ('pending','processing','completed')
       ORDER BY created_at DESC LIMIT 1`,
      [data.orderId, req.user.id, data.method, data.currency, data.amount]
    );
    if (duplicateRows[0]) {
      const existing = duplicateRows[0];
      throw new AppError(
        existing.status === 'completed'
          ? 'An identical payment has already been completed for this order'
          : 'An identical payment request is already active for this order',
        409,
        'DUPLICATE_PAYMENT'
      );
    }
  }

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

const updateStatus = asyncHandler(async (req, res) => {
  const data = z.object({
    status: z.enum(['processing','completed','failed','refunded']),
  }).parse(req.body);
  const { rows: currentRows } = await query(
    `SELECT p.*, o.buyer_id, o.supplier_id, o.bank_id, o.reference AS order_reference
     FROM payment_requests p
     LEFT JOIN orders o ON o.id = p.order_id
     WHERE p.id = $1`,
    [req.params.id]
  );
  const current = currentRows[0];
  if (!current) throw new AppError('Payment request not found', 404, 'PAYMENT_NOT_FOUND');
  if (req.user.role !== 'admin') {
    if (req.user.role !== 'bank' || current.bank_id !== req.user.id) {
      throw new AppError('Only the assigned bank or an administrator can update this payment', 403, 'FORBIDDEN');
    }
  }
  const allowed = {
    pending: ['processing','failed'],
    processing: ['completed','failed'],
    completed: ['refunded'],
    failed: [],
    refunded: [],
  };
  if (!allowed[current.status]?.includes(data.status)) {
    throw new AppError(`Invalid payment status transition: ${current.status} → ${data.status}`, 409, 'INVALID_PAYMENT_TRANSITION');
  }
  if (data.status === 'completed' && current.order_id) {
    const { rows: orderRows } = await query('SELECT status FROM orders WHERE id = $1', [current.order_id]);
    const order = orderRows[0];
    if (!order || ['cancelled', 'delivered'].includes(order.status)) {
      throw new AppError('A completed payment cannot be recorded against a cancelled or completed order', 409, 'ORDER_NOT_PAYABLE');
    }
  }
  const { rows } = await query(
    'UPDATE payment_requests SET status=$1, updated_at=now() WHERE id=$2 RETURNING *',
    [data.status, req.params.id]
  );
  await audit.log(req.user.id, 'Payment Status Updated', `${current.order_reference || 'Unlinked payment'} — ${current.provider_ref} → ${data.status}`, req.ip);
  res.json({ paymentRequest: rows[0] });
});

const getReconciliation = asyncHandler(async (req, res) => {
  const { rows } = await query(
    'SELECT p.id,p.order_id,p.initiated_by,p.method,p.amount,p.currency,p.status,p.provider_ref,p.created_at,p.updated_at,o.reference AS order_reference,o.status AS order_status,l.reference AS lc_reference,l.status AS lc_status,l.amount_usd AS lc_amount_usd FROM payment_requests p LEFT JOIN orders o ON o.id=p.order_id LEFT JOIN letters_of_credit l ON l.order_id=p.order_id WHERE p.id=$1 ORDER BY l.created_at DESC NULLS LAST LIMIT 1',
    [req.params.id]
  );
  const payment = rows[0];
  if (!payment) throw new AppError('Payment request not found',404,'PAYMENT_NOT_FOUND');
  let allowed = req.user.role === 'admin' || req.user.id === payment.initiated_by;
  if (!allowed && payment.order_id) {
    const { rows: bankRows } = await query('SELECT bank_id FROM orders WHERE id=$1',[payment.order_id]);
    allowed = bankRows[0]?.bank_id === req.user.id;
  }
  if (!allowed) throw new AppError('Forbidden',403,'FORBIDDEN');
  const { rows: audit } = await query(
    'SELECT al.id,al.action,al.detail,al.created_at,u.full_name AS actor_name,u.role AS actor_role FROM audit_log al LEFT JOIN users u ON u.id=al.actor_id WHERE al.detail ILIKE $1 OR al.detail ILIKE $2 ORDER BY al.created_at DESC LIMIT 50',
    ['%'+(payment.provider_ref || payment.id)+'%','%'+(payment.order_reference || payment.order_id)+'%']
  );
  res.json({payment,audit});
});

const listMine = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT p.*, o.reference AS order_reference, o.status AS order_status
       FROM payment_requests p
       LEFT JOIN orders o ON o.id = p.order_id
      WHERE p.initiated_by = $1
      ORDER BY p.created_at DESC`,
    [req.user.id]
  );
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

module.exports = { initiate, listMine, getReconciliation, updateStatus, forexRates, convert, compliance };
