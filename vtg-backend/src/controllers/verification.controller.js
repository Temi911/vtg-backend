const path = require('path');
const { z } = require('zod');
const { query } = require('../config/db');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');
const audit = require('../services/audit.service');
const { sendVerificationStatusEmail } = require('../services/verification-notification.service');
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
    `SELECT doc_type,
            CASE WHEN expires_at IS NOT NULL AND expires_at <= now() THEN 'expired' ELSE status::text END AS status
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
  const docsVerified = required.every(type => latest.get(type) === 'verified');
  const verified = docsVerified && Boolean(logoUrl);
  const hasRejectedOrExpired = required.some(type => ['rejected', 'expired'].includes(latest.get(type)));
  const hasSubmitted = required.some(type => latest.has(type));
  const status = verified ? 'verified' : hasRejectedOrExpired ? 'needs_correction' : hasSubmitted ? 'under_review' : 'pending';
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

  let previousStatus = null;
  if (['supplier','bank'].includes(req.user.role)) {
    const prior = await query('SELECT business_verification_status FROM users WHERE id=$1', [req.user.id]);
    previousStatus = prior.rows[0]?.business_verification_status || 'pending';
  }

  const { rows } = await query(
    `INSERT INTO verification_documents
      (user_id, doc_type, file_name, file_path, mime_type, file_size_bytes)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id, user_id, doc_type, file_name, mime_type, file_size_bytes, status, uploaded_at`,
    [req.user.id, docType, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size]
  );

  let verificationStatus = 'not_required';
  if (['supplier','bank'].includes(req.user.role)) {
    verificationStatus = await refreshBusinessVerificationStatus(req.user.id, req.user.role);
    if (verificationStatus !== previousStatus) {
      const u = (await query('SELECT email, full_name, role FROM users WHERE id=$1', [req.user.id])).rows[0];
      await sendVerificationStatusEmail({ ...u, status: verificationStatus });
    }
  }
  await audit.log(req.user.id, 'Verification Document Uploaded', `${docType}: ${req.file.originalname}`, req.ip);
  res.status(201).json({ document: rows[0], verificationStatus });
});

const listMine = asyncHandler(async (req, res) => {
  if (!['supplier','bank','agent'].includes(req.user.role)) {
    throw new AppError('Verification documents are available for suppliers, banks and agents.', 403, 'FORBIDDEN');
  }
  const { rows } = await query(
    `SELECT vd.id, vd.doc_type, vd.file_name, vd.mime_type, vd.file_size_bytes,
            CASE
              WHEN EXISTS (
                SELECT 1 FROM verification_documents newer
                 WHERE newer.user_id = vd.user_id AND newer.doc_type = vd.doc_type
                   AND newer.uploaded_at > vd.uploaded_at
              ) THEN 'superseded'
              WHEN vd.expires_at IS NOT NULL AND vd.expires_at <= now() THEN 'expired'
              ELSE vd.status::text
            END AS status,
            vd.review_notes, vd.uploaded_at, vd.reviewer_id, vd.reviewed_at, vd.expires_at,
            reviewer.full_name AS reviewer_name
       FROM verification_documents vd
       LEFT JOIN users reviewer ON reviewer.id = vd.reviewer_id
      WHERE vd.user_id = $1
      ORDER BY vd.uploaded_at DESC`,
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
  // Treat the database path as untrusted: never let a malformed row escape the
  // private upload directory. Uploaded verification files contain sensitive evidence.
  const uploadRoot = path.resolve(UPLOAD_DIR);
  const absoluteFile = path.resolve(uploadRoot, doc.file_path);
  if (!absoluteFile.startsWith(uploadRoot + path.sep)) {
    throw new AppError('Verification document is unavailable', 404, 'DOCUMENT_NOT_FOUND');
  }
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  await audit.log(req.user.id, 'Verification Document Downloaded', `documentId=${doc.id}; docType=${doc.doc_type}`, req.ip);
  res.download(absoluteFile, path.basename(doc.file_name));
});

const review = asyncHandler(async (req, res) => {
  const { status, notes, expiresAt } = z.object({
    status: z.enum(['verified','rejected']),
    notes: z.string().max(1000).optional(),
    expiresAt: z.string().datetime().optional()
  }).superRefine((value, ctx) => {
    if (value.status === 'rejected' && !String(value.notes || '').trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['notes'], message: 'A review note is required when rejecting a document.' });
    }
    if (value.expiresAt && value.status !== 'verified') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['expiresAt'], message: 'Only verified evidence can have an expiry date.' });
    }
    if (value.expiresAt && Date.parse(value.expiresAt) <= Date.now()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['expiresAt'], message: 'Expiry must be in the future.' });
    }
  }).parse(req.body);

  const { rows } = await query(
    `UPDATE verification_documents
        SET status = $1, reviewer_id = $2, review_notes = $3, reviewed_at = now(),
            expires_at = CASE WHEN $1 = 'verified' THEN $4::timestamptz ELSE NULL END
      WHERE id = $5 AND status = 'pending'
        AND NOT EXISTS (
          SELECT 1 FROM verification_documents newer
           WHERE newer.user_id = verification_documents.user_id
             AND newer.doc_type = verification_documents.doc_type
             AND newer.uploaded_at > verification_documents.uploaded_at
        )
      RETURNING id, user_id, doc_type, file_name, status, review_notes, uploaded_at, reviewed_at, expires_at`,
    [status, req.user.id, notes || null, status === 'verified' ? expiresAt || null : null, req.params.id]
  );
  if (!rows[0]) throw new AppError('Verification document not found', 404);

  const owner = (await query('SELECT id, role, email, full_name, business_verification_status FROM users WHERE id=$1',[rows[0].user_id])).rows[0];
  let verificationStatus = 'not_required';
  let notificationSent = false;
  if (owner && ['supplier','bank'].includes(owner.role)) {
    verificationStatus = await refreshBusinessVerificationStatus(rows[0].user_id, owner.role);
    if (verificationStatus === 'needs_correction' || verificationStatus === 'verified') {
      notificationSent = await sendVerificationStatusEmail({
        email: owner.email,
        fullName: owner.full_name,
        role: owner.role,
        status: verificationStatus,
        notes: rows[0].review_notes,
      });
    }
  }
  await audit.log(req.user.id, 'Business Verification Reviewed', `${rows[0].file_name} marked ${status}`, req.ip);
  res.json({ document: rows[0], verificationStatus, notificationSent });
});


const reviewQueue = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT vd.id, vd.user_id, vd.doc_type, vd.file_name, vd.mime_type, vd.file_size_bytes,
            vd.status, vd.review_notes, vd.uploaded_at,
            u.email, u.role, u.full_name, u.business_verification_status,
            sp.company_name, sp.company_logo_url,
            bp.bank_name, bp.institution_logo_url
       FROM verification_documents vd
       JOIN users u ON u.id = vd.user_id
       LEFT JOIN supplier_profiles sp ON sp.user_id = vd.user_id
       LEFT JOIN bank_profiles bp ON bp.user_id = vd.user_id
      WHERE vd.status = 'pending' AND u.role IN ('supplier','bank','agent')
        AND vd.uploaded_at = (SELECT MAX(vd2.uploaded_at) FROM verification_documents vd2 WHERE vd2.user_id = vd.user_id AND vd2.doc_type = vd.doc_type)
      ORDER BY vd.uploaded_at ASC`
  );
  const applicants = new Map();
  for (const row of rows) {
    if (!applicants.has(row.user_id)) {
      applicants.set(row.user_id, {
        userId: row.user_id,
        email: row.email,
        fullName: row.full_name,
        role: row.role,
        organisationName: row.company_name || row.bank_name || null,
        logoUrl: row.company_logo_url || row.institution_logo_url || null,
        verificationStatus: row.business_verification_status || 'not_required',
        documents: [],
      });
    }
    applicants.get(row.user_id).documents.push({
      id: row.id,
      docType: row.doc_type,
      fileName: row.file_name,
      mimeType: row.mime_type,
      fileSizeBytes: row.file_size_bytes,
      status: row.status,
      reviewNotes: row.review_notes,
      uploadedAt: row.uploaded_at,
    });
  }
  res.json({ documents: rows, applicants: Array.from(applicants.values()) });
});

module.exports = { upload, listMine, download, review, reviewQueue, refreshBusinessVerificationStatus };
