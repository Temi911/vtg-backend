const { withTransaction } = require('../config/db');
const { AppError } = require('../utils/AppError');

/**
 * Ensures a wallet row exists for (userId, currency); returns its id.
 */
async function ensureWallet(client, userId, currency) {
  // INSERT ... ON CONFLICT makes concurrent first-use transfers safe when
  // both transactions attempt to create the same wallet simultaneously.
  const created = await client.query(
    'INSERT INTO wallet_accounts (user_id, currency, balance) VALUES ($1, $2, 0) ON CONFLICT (user_id, currency) DO NOTHING RETURNING id',
    [userId, currency]
  );
  if (created.rows[0]) return created.rows[0].id;

  const existing = await client.query(
    'SELECT id FROM wallet_accounts WHERE user_id = $1 AND currency = $2',
    [userId, currency]
  );
  if (!existing.rows[0]) throw new AppError('Wallet account could not be prepared', 500, 'WALLET_ACCOUNT_ERROR');
  return existing.rows[0].id;
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


/**
 * Executes an internal VTG wallet transfer as one database transaction.
 * Either both ledger entries and balance changes commit, or neither does.
 */
async function transfer(senderId, recipientId, currency, amount, { senderEmail, recipientName, reference, description } = {}) {
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(Math.round(amount * 100)) || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7) {
    throw new AppError('Amount must be positive and have no more than two decimal places', 400, 'INVALID_AMOUNT');
  }
  if (senderId === recipientId) throw new AppError('You cannot send money to yourself', 400, 'SELF_TRANSFER');
  return withTransaction(async (client) => {
    const senderWalletId = await ensureWallet(client, senderId, currency);
    const recipientWalletId = await ensureWallet(client, recipientId, currency);
    // Lock in a deterministic order to reduce deadlock risk when transfers cross.
    const ids = [senderWalletId, recipientWalletId].sort();
    const locked = await client.query('SELECT id, user_id, balance FROM wallet_accounts WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE', [ids]);
    const sender = locked.rows.find(row => row.user_id === senderId);
    const recipient = locked.rows.find(row => row.user_id === recipientId);
    if (!sender || !recipient) throw new AppError('Wallet accounts could not be prepared', 500, 'WALLET_ACCOUNT_ERROR');
    if (Number(sender.balance) < amount) throw new AppError('Insufficient wallet balance', 400, 'INSUFFICIENT_FUNDS');
    const debited = await client.query('UPDATE wallet_accounts SET balance=balance-$1 WHERE id=$2 RETURNING balance', [amount, sender.id]);
    const credited = await client.query('UPDATE wallet_accounts SET balance=balance+$1 WHERE id=$2 RETURNING balance', [amount, recipient.id]);
    await client.query(
      `INSERT INTO wallet_transactions (wallet_id,type,amount,balance_after,counterparty_name,reference,description)
       VALUES ($1,'debit',$2,$3,$4,$5,$6),($7,'credit',$2,$8,$9,$5,$6)`,
      [sender.id, amount, debited.rows[0].balance, recipientName || null, reference || null, description || 'VTG wallet transfer',
       recipient.id, credited.rows[0].balance, senderEmail || null]
    );
    return { senderBalance: debited.rows[0].balance, recipientBalance: credited.rows[0].balance, reference: reference || null };
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

module.exports = { credit, creditWithClient, debit, transfer, getBalances, getTransactions, ensureWallet };
