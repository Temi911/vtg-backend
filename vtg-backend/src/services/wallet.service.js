const { withTransaction } = require('../config/db');
const { AppError } = require('../utils/AppError');

/**
 * Ensures a wallet row exists for (userId, currency); returns its id.
 */
async function ensureWallet(client, userId, currency) {
  const existing = await client.query(
    'SELECT id FROM wallet_accounts WHERE user_id = $1 AND currency = $2',
    [userId, currency]
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const created = await client.query(
    'INSERT INTO wallet_accounts (user_id, currency, balance) VALUES ($1, $2, 0) RETURNING id',
    [userId, currency]
  );
  return created.rows[0].id;
}

/**
 * Credits (adds to) a user's wallet balance and records the transaction.
 */
async function creditWithClient(client, userId, currency, amount, { counterpartyName, reference, description } = {}) {
  if (amount <= 0) throw new AppError('Amount must be greater than zero', 400);
  const walletId = await ensureWallet(client, userId, currency);
  const { rows } = await client.query(
    'UPDATE wallet_accounts SET balance = balance + $1 WHERE id = $2 RETURNING balance',
    [amount, walletId]
  );
  const balanceAfter = rows[0].balance;
  await client.query(
    `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, counterparty_name, reference, description)
     VALUES ($1, 'credit', $2, $3, $4, $5, $6)`,
    [walletId, amount, balanceAfter, counterpartyName || null, reference || null, description || null]
  );
  return { walletId, balance: balanceAfter };
}

async function credit(userId, currency, amount, options = {}) {
  return withTransaction((client) => creditWithClient(client, userId, currency, amount, options));
}

/**
 * Debits (subtracts from) a user's wallet balance, refusing to go negative,
 * and records the transaction.
 */
async function debit(userId, currency, amount, { counterpartyName, reference, description } = {}) {
  if (amount <= 0) throw new AppError('Amount must be greater than zero', 400);
  return withTransaction(async (client) => {
    const walletId = await ensureWallet(client, userId, currency);
    const current = await client.query('SELECT balance FROM wallet_accounts WHERE id = $1 FOR UPDATE', [walletId]);
    const currentBalance = Number(current.rows[0].balance);
    if (currentBalance < amount) {
      throw new AppError('Insufficient wallet balance', 400, 'INSUFFICIENT_FUNDS');
    }
    const { rows } = await client.query(
      'UPDATE wallet_accounts SET balance = balance - $1 WHERE id = $2 RETURNING balance',
      [amount, walletId]
    );
    const balanceAfter = rows[0].balance;
    await client.query(
      `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, counterparty_name, reference, description)
       VALUES ($1, 'debit', $2, $3, $4, $5, $6)`,
      [walletId, amount, balanceAfter, counterpartyName || null, reference || null, description || null]
    );
    return { walletId, balance: balanceAfter };
  });
}

async function getBalances(userId) {
  const { rows } = await withTransaction((client) =>
    client.query('SELECT currency, balance FROM wallet_accounts WHERE user_id = $1 ORDER BY currency', [userId])
  );
  return rows;
}

async function getTransactions(userId, { limit = 50 } = {}) {
  const { rows } = await withTransaction((client) =>
    client.query(
      `SELECT wt.* FROM wallet_transactions wt
       JOIN wallet_accounts wa ON wa.id = wt.wallet_id
       WHERE wa.user_id = $1
       ORDER BY wt.created_at DESC
       LIMIT $2`,
      [userId, limit]
    )
  );
  return rows;
}

module.exports = { credit, creditWithClient, debit, getBalances, getTransactions, ensureWallet };
