const path = require('path');
const { z } = require('zod');
const { query } = require('../config/db');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');
const audit = require('../services/audit.service');

const uploadMetaSchema = z.object({
  docType: z.enum(['bill_of_lading', 'commercial_invoice', 'packing_list', 'certificate_of_origin', 'id_document', 'business_cert', 'bank_statement', 'other']),
  orderId: z.string().uuid().optional(),
  lcId: z.string().uuid().optional(),
}).refine((data) => data.orderId || data.lcId, {
  message: 'orderId or lcId is required',
});

async function getDocumentAccess(id, user) {
  const { rows } = await query(
    `SELECT d.*, o.buyer_id AS order_buyer_id, o.supplier_id AS order_supplier_id, o.bank_id AS order_bank_id,
            lc.buyer_id AS lc_buyer_id, lc.supplier_id AS lc_supplier_id, lc.issuing_bank_id AS lc_bank_id
       FROM documents d
       LEFT JOIN orders o ON o.id = d.order_id
       LEFT JOIN letters_of_credit lc ON lc.id = d.lc_id
      WHERE d.id = $1`,
    [id]
  );
  const doc = rows[0];
  if (!doc) throw new AppError('Document not found', 404);

  const allowed =
    user.role === 'admin' ||
    doc.uploaded_by === user.id ||
    doc.order_buyer_id === user.id ||
    doc.order_supplier_id === user.id ||
    doc.order_bank_id === user.id ||
    doc.lc_buyer_id === user.id ||
    doc.lc_supplier_id === user.id ||
    doc.lc_bank_id === user.id;

  if (!allowed) throw new AppError('You do not have access to this document', 403, 'FORBIDDEN');
  return doc;
}

const upload = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No file was uploaded', 400);
  const data = uploadMetaSchema.parse(req.body);

  if (data.lcId) {
    const { rows } = await query(
      `SELECT lc.*, o.buyer_id AS order_buyer_id, o.supplier_id AS order_supplier_id, o.bank_id AS order_bank_id
         FROM letters_of_credit lc
         JOIN orders o ON o.id = lc.order_id
        WHERE lc.id = $1`,
      [data.lcId]
    );
    const lc = rows[0];
    if (!lc) throw new AppError('LC not found', 404);
    const allowed = req.user.role === 'admin' ||
      lc.buyer_id === req.user.id || lc.supplier_id === req.user.id ||
      lc.issuing_bank_id === req.user.id || lc.order_bank_id === req.user.id;
    if (!allowed) throw new AppError('You do not have access to this LC', 403, 'FORBIDDEN');
    if (data.orderId && data.orderId !== lc.order_id) throw new AppError('orderId does not match LC', 400);
  } else if (data.orderId) {
    const { rows } = await query('SELECT * FROM orders WHERE id = $1', [data.orderId]);
    const order = rows[0];
    if (!order) throw new AppError('Order not found', 404);
    const allowed = req.user.role === 'admin' ||
      order.buyer_id === req.user.id || order.supplier_id === req.user.id || order.bank_id === req.user.id;
    if (!allowed) throw new AppError('You do not have access to this order', 403, 'FORBIDDEN');
  }

  const { rows } = await query(
    `INSERT INTO documents (uploaded_by, order_id, lc_id, doc_type, file_name, file_path, file_size_bytes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.user.id, data.orderId || null, data.lcId || null, data.docType, req.file.originalname, req.file.filename, req.file.size]
  );

  await audit.log(req.user.id, 'Document Uploaded', `${data.docType} uploaded (${req.file.originalname})`, req.ip);
  res.status(201).json({ document: rows[0] });
});

const listForOrder = asyncHandler(async (req, res) => {
  const { rows: orders } = await query('SELECT * FROM orders WHERE id = $1', [req.params.orderId]);
  const order = orders[0];
  if (!order) throw new AppError('Order not found', 404);
  const allowed = req.user.role === 'admin' ||
    order.buyer_id === req.user.id || order.supplier_id === req.user.id || order.bank_id === req.user.id;
  if (!allowed) throw new AppError('You do not have access to this order', 403, 'FORBIDDEN');

  const { rows } = await query('SELECT * FROM documents WHERE order_id = $1 ORDER BY uploaded_at DESC', [req.params.orderId]);
  res.json({ documents: rows });
});

const verify = asyncHandler(async (req, res) => {
  const schema = z.object({ status: z.enum(['verified', 'rejected']) });
  const { status } = schema.parse(req.body);
  const doc = await getDocumentAccess(req.params.id, req.user);

  if (req.user.role !== 'admin') {
    if (req.user.role !== 'bank') throw new AppError('Only a bank officer can review documents', 403, 'FORBIDDEN');
    if (doc.order_bank_id !== req.user.id && doc.lc_bank_id !== req.user.id) {
      throw new AppError('You are not the bank assigned to this document', 403, 'FORBIDDEN');
    }
  }

  const { rows } = await query(
    'UPDATE documents SET status = $1 WHERE id = $2 RETURNING *',
    [status, req.params.id]
  );
  await audit.log(req.user.id, 'Document Reviewed', `${rows[0].file_name} marked ${status}`, req.ip);
  res.json({ document: rows[0] });
});

const download = asyncHandler(async (req, res) => {
  const doc = await getDocumentAccess(req.params.id, req.user);
  const { UPLOAD_DIR } = require('../middleware/upload');
  res.download(path.join(UPLOAD_DIR, doc.file_path), doc.file_name);
});

module.exports = { upload, listForOrder, verify, download };
