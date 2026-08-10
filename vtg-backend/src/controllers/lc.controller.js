const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const { query, withTransaction } = require('../config/db');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');
const audit = require('../services/audit.service');
const wallet = require('../services/wallet.service');
const { notify } = require('../services/notification.service');

function lcReference() {
  const year = new Date().getFullYear();
  return `VTG-LC-${year}-${uuidv4().slice(0, 6).toUpperCase()}`;
}

const requestSchema = z.object({
  orderId: z.string().uuid(),
  amountUsd: z.number().positive(),
  issuingBankName: z.string().min(2),
  expiryDate: z.string().optional(),
});

const request = asyncHandler(async (req, res) => {
  const data = requestSchema.parse(req.body);
  const orderRes = await query('SELECT * FROM orders WHERE id = $1', [data.orderId]);
  const order = orderRes.rows[0];
  if (!order) throw new AppError('Order not found', 404);
  if (order.buyer_id !== req.user.id) throw new AppError('Not your order', 403, 'FORBIDDEN');

  const reference = lcReference();
  const { rows } = await query(
    `INSERT INTO letters_of_credit (reference, order_id, buyer_id, supplier_id, issuing_bank_name, amount_usd, expiry_date, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'requested') RETURNING *`,
    [reference, order.id, order.buyer_id, order.supplier_id, data.issuingBankName, data.amountUsd, data.expiryDate || null]
  );

  await audit.log(req.user.id, 'LC Requested', `${reference} — $${data.amountUsd} via ${data.issuingBankName}`, req.ip);
  await notify(order.supplier_id, 'New LC Request', `${reference} — $${data.amountUsd} requested via ${data.issuingBankName}. Awaiting bank issuance.`);
  res.status(201).json({ letterOfCredit: rows[0] });
});

const listMine = asyncHandler(async (req, res) => {
  let where, params;
  if (req.user.role === 'buyer') {
    where = 'lc.buyer_id = $1';
    params = [req.user.id];
  } else if (req.user.role === 'supplier') {
    where = 'lc.supplier_id = $1';
    params = [req.user.id];
  } else if (req.user.role === 'bank') {
    where = '(lc.issuing_bank_id = $1 OR (lc.issuing_bank_id IS NULL AND o.bank_id = $1))';
    params = [req.user.id];
  } else {
    throw new AppError('You do not have access to LCs', 403, 'FORBIDDEN');
  }

  const { rows } = await query(
    `SELECT lc.*, o.reference AS order_reference
       FROM letters_of_credit lc
       JOIN orders o ON o.id = lc.order_id
      WHERE ${where}
      ORDER BY lc.created_at DESC`,
    params
  );
  res.json({ lettersOfCredit: rows });
});

const getOne = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT lc.*, o.reference AS order_reference, o.bank_id AS order_bank_id
       FROM letters_of_credit lc
       JOIN orders o ON o.id = lc.order_id
      WHERE (lc.id = $1 OR lc.reference = $1)`,
    [req.params.id]
  );
  const lc = rows[0];
  if (!lc) throw new AppError('LC not found', 404);

  const allowed =
    (req.user.role === 'buyer' && lc.buyer_id === req.user.id) ||
    (req.user.role === 'supplier' && lc.supplier_id === req.user.id) ||
    (req.user.role === 'bank' && (lc.issuing_bank_id === req.user.id || (lc.issuing_bank_id == null && lc.order_bank_id === req.user.id)));

  if (!allowed) throw new AppError('You do not have access to this LC', 403, 'FORBIDDEN');

  res.json({ letterOfCredit: lc });
});

const issue = asyncHandler(async (req, res) => {
  const { rows: existingRows } = await query(
    `SELECT lc.*, o.bank_id AS order_bank_id
       FROM letters_of_credit lc
       JOIN orders o ON o.id = lc.order_id
      WHERE lc.id = $1`,
    [req.params.id]
  );
  const lc = existingRows[0];
  if (!lc) throw new AppError('LC not found', 404);

  const bankCanIssue = lc.issuing_bank_id === req.user.id ||
    (lc.issuing_bank_id == null && (lc.order_bank_id === req.user.id || lc.order_bank_id == null));
  if (!bankCanIssue) throw new AppError('You are not authorized to issue this LC', 403, 'FORBIDDEN');
  if (lc.status !== 'requested') throw new AppError(`LC cannot be issued from status "${lc.status}"`, 409, 'INVALID_STATE');

  const swiftRef = `MT700-${uuidv4().slice(0, 10).toUpperCase()}`;
  const { rows } = await query(
    `UPDATE letters_of_credit
        SET status = 'issued', issuing_bank_id = $1, swift_mt700_ref = $2, updated_at = now()
      WHERE id = $3 AND status = 'requested'
      RETURNING *`,
    [req.user.id, swiftRef, req.params.id]
  );
  if (!rows[0]) throw new AppError('LC was already updated; please refresh and try again', 409, 'CONFLICT');

  await audit.log(req.user.id, 'LC Issued', `${rows[0].reference} issued, SWIFT ${swiftRef} (mock — no real SWIFT network was used)`, req.ip);
  await notify(rows[0].buyer_id, 'LC Issued', `${rows[0].reference} has been issued via SWIFT ${swiftRef}.`);
  await notify(rows[0].supplier_id, 'LC Confirmed', `${rows[0].reference} for $${rows[0].amount_usd} confirmed via SWIFT ${swiftRef}. You may proceed to shipment.`);
  res.json({ letterOfCredit: rows[0] });
});

const docsPresented = asyncHandler(async (req, res) => {
  const { rows: existingRows } = await query('SELECT * FROM letters_of_credit WHERE id = $1', [req.params.id]);
  const lc = existingRows[0];
  if (!lc) throw new AppError('LC not found', 404);
  if (lc.supplier_id !== req.user.id) throw new AppError('You are not the supplier for this LC', 403, 'FORBIDDEN');
  if (lc.status !== 'issued') throw new AppError(`Shipping documents cannot be presented from status "${lc.status}"`, 409, 'INVALID_STATE');

  const { rows } = await query(
    `UPDATE letters_of_credit SET status = 'docs_presented', updated_at = now()
      WHERE id = $1 AND supplier_id = $2 AND status = 'issued'
      RETURNING *`,
    [req.params.id, req.user.id]
  );
  if (!rows[0]) throw new AppError('LC was already updated; please refresh and try again', 409, 'CONFLICT');

  await audit.log(req.user.id, 'LC Docs Presented', `${rows[0].reference} — shipping docs presented`, req.ip);
  await notify(rows[0].buyer_id, 'Shipping Docs Presented', `Your supplier has presented shipping documents for ${rows[0].reference}.`);
  if (rows[0].issuing_bank_id) await notify(rows[0].issuing_bank_id, 'Docs Awaiting Review', `${rows[0].reference} — shipping documents are ready for your review.`);
  res.json({ letterOfCredit: rows[0] });
});

const verifyAndPay = asyncHandler(async (req, res) => {
  const result = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT lc.*, o.bank_id AS order_bank_id
         FROM letters_of_credit lc
         JOIN orders o ON o.id = lc.order_id
        WHERE lc.id = $1
        FOR UPDATE`,
      [req.params.id]
    );
    const lc = rows[0];
    if (!lc) throw new AppError('LC not found', 404);

    if (lc.issuing_bank_id !== req.user.id) {
      throw new AppError('Only the issuing bank can verify and pay this LC', 403, 'FORBIDDEN');
    }
    if (lc.status !== 'docs_presented') {
      throw new AppError(`LC cannot be paid from status "${lc.status}"`, 409, 'INVALID_STATE');
    }

    const swiftRef = `MT103-${uuidv4().slice(0, 10).toUpperCase()}`;
    const updated = await client.query(
      `UPDATE letters_of_credit
          SET status = 'paid', swift_mt103_ref = $1, updated_at = now()
        WHERE id = $2 AND issuing_bank_id = $3 AND status = 'docs_presented'
        RETURNING *`,
      [req.params.id, req.user.id, swiftRef]
    );
    if (!updated.rows[0]) throw new AppError('LC was already updated; please refresh and try again', 409, 'CONFLICT');

    await wallet.creditWithClient(client, lc.supplier_id, 'USD', Number(lc.amount_usd), {
      counterpartyName: 'Bank of China (via LC)',
      reference: lc.reference,
      description: `LC payment released — ${lc.reference}`,
    });

    return { lc: updated.rows[0], swiftRef };
  });

  const { lc, swiftRef } = result;
  await audit.log(req.user.id, 'LC Verified & Paid', `${lc.reference} — SWIFT ${swiftRef} (mock network, real wallet credit)`, req.ip);
  await notify(lc.supplier_id, 'Payment Released', `$${lc.amount_usd} released for ${lc.reference} via SWIFT ${swiftRef}. Funds credited to your wallet.`);
  await notify(lc.buyer_id, 'LC Payment Complete', `Payment for ${lc.reference} has been released to your supplier.`);
  res.json({ letterOfCredit: lc });
});

module.exports = { request, listMine, getOne, issue, docsPresented, verifyAndPay };
