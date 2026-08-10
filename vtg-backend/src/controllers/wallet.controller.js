const { z } = require('zod');
const { query } = require('../config/db');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');
const wallet = require('../services/wallet.service');
const audit = require('../services/audit.service');

const getBalances = asyncHandler(async (req, res) => {
  const balances = await wallet.getBalances(req.user.id);
  res.json({ balances });
});

const getTransactions = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const transactions = await wallet.getTransactions(req.user.id, { limit });
  res.json({ transactions });
});

const sendSchema = z.object({
  recipientEmail: z.string().email(),
  amount: z.number().positive(),
  currency: z.enum(['USD', 'NGN', 'CNY']),
  note: z.string().optional(),
});

// POST /wallet/send — simple peer-to-peer transfer between two VTG users
const send = asyncHandler(async (req, res) => {
  const data = sendSchema.parse(req.body);
  const recipientRes = await query('SELECT id, full_name FROM users WHERE email = $1', [data.recipientEmail]);
  const recipient = recipientRes.rows[0];
  if (!recipient) throw new AppError('Recipient not found on VTG', 404, 'RECIPIENT_NOT_FOUND');
  if (recipient.id === req.user.id) throw new AppError('You cannot send money to yourself', 400);

  await wallet.debit(req.user.id, data.currency, data.amount, {
    counterpartyName: recipient.full_name,
    description: data.note || 'Wallet transfer',
  });
  await wallet.credit(recipient.id, data.currency, data.amount, {
    counterpartyName: req.user.email,
    description: data.note || 'Wallet transfer',
  });

  await audit.log(req.user.id, 'Wallet Transfer', `Sent ${data.amount} ${data.currency} to ${data.recipientEmail}`, req.ip);
  res.json({ message: 'Payment dispatched' });
});

module.exports = { getBalances, getTransactions, send };
