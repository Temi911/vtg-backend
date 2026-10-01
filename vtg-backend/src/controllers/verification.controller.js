const path = require('path');
const { z } = require('zod');
const { query } = require('../config/db');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');
const audit = require('../services/audit.service');
const { UPLOAD_DIR } = require('../middleware/upload');

const SUPPLIER_DOCS = new Set(['company_registration','business_license','tax_certificate','export_license','company_address_proof','other']);
const BANK_DOCS = new Set(['bank_license','regulatory_certificate','company_registration','swift_bic_certificate','institution_address_proof','officer_authorization','other']);
const SUPPLIER_REQUIRED_DOCS = ['company_registration','business_license','tax_certificate','company_address_proof'];
const BANK_REQUIRED_DOCS = ['bank_license','regulatory_certificate','company_registration','swift_bic_certificate','institution_address_proof','officer_authorization'];

const AGENT_DOCS = new Set(['government_id','proof_of_address','business_registration','professional_certificate','reference_document','other']);

function allowedDocTypes(role) {
  return role === 'supplier' ? SUPPLIER_DOCS : role === 'bank' ? BANK_DOCS : role === 'agent' ? AGENT_DOCS : new Set();
}

async function refreshBusinessVerificationStatus(userId, role) {
  if (!['supplier','bank'].includes(role)) return 'not_required';
  const required = role === 'supplier' ? SUPPLIER_REQUIRED_DOCS : BANK_REQUIRED_DOCS;
  const { rows } = await query(
    `SELECT doc_type, status
       FROM verification_documents
      WHERE user_id = $1 AND doc_type = ANY($2::text[])
      ORDER BY uploaded_at DESC`,
    [userId, required]
  );
  const latest = new Map();
  for (const row of rows) if (!latest.has(row.doc_type)) latest.set(row.doc_type, row.status);
  let logoUrl = null;
  if (role === 'supplier') logoUrl = (await query('SELECT company_logo_url FROM supplier_profiles WHERE user_id=$1',[userId])).rows[0]?.company_logo_url || null;
  if (role === 'bank') logoUrl = (await query('SELECT institution_logo_url FROM bank_profiles WHERE user_id=$1',[userId])).rows[0]?.institution_logo_url || null;
  const verified = required.every(type => latest.get(type) === 'verified') && Boolean(logoUrl);
  const hasRejected = required.some(type => latest.get(type) === 'rejected');
  const hasSubmitted = required.some(type => latest.has(type));
  const status = verified ? 'verified' : hasRejected ? 'needs_correction' : hasSubmitted ? 'under_review' : 'pending';
  await query('UPDATE users SET business_verification_status=$1 WHERE id=$2', [status, userId]);
  return status;
}

const upload = asyncHandler(async (req, res) => {
  if (!['supplier','bank','agent'].includes(req.user.role)) {
    throw new AppError('Business verification uploads are available for suppliers, banks and agents.', 403, 'FORBIDDEN');
  }
  if (!req.file) throw new AppError('No file was uploaded', 400);
  const { docType } = z.object({ docType: z.string().min(2).max(80) }).parse(req.body);
  if (!allowedDocTypes(req.user.role).has(docType)) {
    throw new AppError('This document type is not valid for your account type.', 400, 'INVALID_DOCUMENT_TYPE');
  }

  if (['supplier','bank'].includes(req.user.role)) await query('UPDATE users SET business_verification_status=$1 WHERE id=$2', ['under_review', req.user.id]);

  const { rows } = await query(
    `INSERT INTO verification_documents
      (user_id, doc_type, file_name, file_path, mime_type, file_size_bytes)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id, user_id, doc_type, file_name, mime_type, file_size_bytes, status, uploaded_at`,
    [req.user.id, docType, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size]
  );

  if (['supplier','bank'].includes(req.user.role)) await refreshBusinessVerificationStatus(req.user.id, req.user.role);
  await audit.log(req.user.id, 'Verification Document Uploaded', `${docType}: ${req.file.originalname}`, req.ip);
  res.status(201).json({ document: rows[0] });
});

const listMine = asyncHandler(async (req, res) => {
  if (!['supplier','bank','agent'].includes(req.user.role)) {
    throw new AppError('Verification documents are available for suppliers, banks and agents.', 403, 'FORBIDDEN');
  }
  const { rows } = await query(
    `SELECT id, doc_type, file_name, mime_type, file_size_bytes, status, review_notes, uploaded_at, reviewed_at
       FROM verification_documents WHERE user_id = $1 ORDER BY uploaded_at DESC`,
    [req.user.id]
  );
  const verificationStatus = ['supplier','bank'].includes(req.user.role) ? await refreshBusinessVerificationStatus(req.user.id, req.user.role) : 'not_required';
  let logoUrl=null;if(req.user.role==='supplier')logoUrl=(await query('SELECT company_logo_url FROM supplier_profiles WHERE user_id=$1',[req.user.id])).rows[0]?.company_logo_url||null;if(req.user.role==='bank')logoUrl=(await query('SELECT institution_logo_url FROM bank_profiles WHERE user_id=$1',[req.user.id])).rows[0]?.institution_logo_url||null;res.json({ documents: rows, verificationStatus, logoUploaded:Boolean(logoUrl) });
});

const download = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT vd.*, u.role FROM verification_documents vd JOIN users u ON u.id = vd.user_id WHERE vd.id = $1`,
    [req.params.id]
  );
  const doc = rows[0];
  if (!doc) throw new AppError('Verification document not found', 404);
  if (req.user.role !== 'admin' && req.user.id !== doc.user_id) {
    throw new AppError('You do not have access to this document', 403, 'FORBIDDEN');
  }
  res.download(path.join(UPLOAD_DIR, doc.file_path), doc.file_name);
});

const review = asyncHandler(async (req, res) => {
  const { status, notes } = z.object({
    status: z.enum(['verified','rejected']),
    notes: z.string().max(1000).optional()
  }).parse(req.body);

  const { rows } = await query(
    `UPDATE verification_documents
        SET status = $1, reviewer_id = $2, review_notes = $3, reviewed_at = now()
      WHERE id = $4
      RETURNING id, user_id, doc_type, file_name, status, review_notes, uploaded_at, reviewed_at`,
    [status, req.user.id, notes || null, req.params.id]
  );
  if (!rows[0]) throw new AppError('Verification document not found', 404);

  const owner = (await query('SELECT role FROM users WHERE id=$1',[rows[0].user_id])).rows[0];
  if (owner && ['supplier','bank'].includes(owner.role)) await refreshBusinessVerificationStatus(rows[0].user_id, owner.role);
  await audit.log(req.user.id, 'Business Verification Reviewed', `${rows[0].file_name} marked ${status}`, req.ip);
  res.json({ document: rows[0] });
});


const reviewQueue = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT vd.id, vd.user_id, vd.doc_type, vd.file_name, vd.mime_type, vd.file_size_bytes,
            vd.status, vd.review_notes, vd.uploaded_at, u.email, u.role
       FROM verification_documents vd
       JOIN users u ON u.id = vd.user_id
      WHERE vd.status = 'pending' AND u.role IN ('supplier','bank','agent')
      ORDER BY vd.uploaded_at ASC`
  );
  res.json({ documents: rows });
});
\nmodule.exports = { upload, listMine, download, review, reviewQueue, refreshBusinessVerificationStatus };
