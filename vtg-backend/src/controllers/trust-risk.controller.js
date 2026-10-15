const { z } = require('zod');
const { query } = require('../config/db');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');
const audit = require('../services/audit.service');

const createFlag = asyncHandler(async (req, res) => {
  const input = z.object({
    subjectUserId: z.string().uuid(),
    category: z.string().trim().min(2).max(80),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    sourceType: z.enum(['official', 'licensed_provider', 'user_report', 'internal_review', 'other']),
    sourceReference: z.string().trim().max(500).optional(),
    rationale: z.string().trim().min(10).max(2000),
  }).parse(req.body);

  const subject = await query('SELECT id, role FROM users WHERE id = $1', [input.subjectUserId]);
  if (!subject.rows[0]) throw new AppError('Target account not found', 404, 'USER_NOT_FOUND');

  const { rows } = await query(
    `INSERT INTO trust_risk_flags
      (subject_user_id, created_by, category, severity, source_type, source_reference, rationale)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id, subject_user_id, created_by, category, severity, source_type, source_reference,
               rationale, status, created_at, updated_at`,
    [input.subjectUserId, req.user.id, input.category, input.severity, input.sourceType, input.sourceReference || null, input.rationale]
  );
  await audit.log(req.user.id, 'Trust Risk Flag Created', `flagId=${rows[0].id}; severity=${input.severity}; source=${input.sourceType}`, req.ip);
  res.status(201).json({ flag: rows[0] });
});

const listFlags = asyncHandler(async (req, res) => {
  const filter = z.object({
    status: z.enum(['open', 'reviewing', 'resolved', 'dismissed']).optional(),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(100),
  }).parse(req.query);

  const { rows } = await query(
    `SELECT f.id, f.subject_user_id, subject.full_name AS subject_name, subject.email AS subject_email,
            subject.role AS subject_role, f.created_by, creator.full_name AS creator_name,
            f.category, f.severity, f.source_type, f.source_reference, f.rationale, f.status,
            f.resolution_notes, f.resolved_by, resolver.full_name AS resolver_name,
            f.resolved_at, f.created_at, f.updated_at
       FROM trust_risk_flags f
       JOIN users subject ON subject.id = f.subject_user_id
       JOIN users creator ON creator.id = f.created_by
       LEFT JOIN users resolver ON resolver.id = f.resolved_by
      WHERE ($1::text IS NULL OR f.status = $1)
        AND ($2::text IS NULL OR f.severity = $2)
      ORDER BY CASE f.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
               f.created_at DESC
      LIMIT $3`,
    [filter.status || null, filter.severity || null, filter.limit]
  );
  res.json({ flags: rows });
});

const updateFlag = asyncHandler(async (req, res) => {
  const input = z.object({
    status: z.enum(['reviewing', 'resolved', 'dismissed']),
    resolutionNotes: z.string().trim().max(2000).optional(),
  }).superRefine((value, ctx) => {
    if (['resolved', 'dismissed'].includes(value.status) && String(value.resolutionNotes || '').trim().length < 5) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['resolutionNotes'], message: 'Resolution notes of at least five characters are required.' });
    }
  }).parse(req.body);

  const terminal = ['resolved', 'dismissed'].includes(input.status);
  const { rows } = await query(
    `UPDATE trust_risk_flags
        SET status = $1,
            resolution_notes = CASE WHEN $1 IN ('resolved','dismissed') THEN $2 ELSE NULL END,
            resolved_by = CASE WHEN $1 IN ('resolved','dismissed') THEN $3::uuid ELSE NULL END,
            resolved_at = CASE WHEN $1 IN ('resolved','dismissed') THEN now() ELSE NULL END,
            updated_at = now()
      WHERE id = $4 AND status IN ('open','reviewing')
      RETURNING id, subject_user_id, created_by, category, severity, source_type, source_reference,
                rationale, status, resolution_notes, resolved_by, resolved_at, created_at, updated_at`,
    [input.status, terminal ? input.resolutionNotes : null, terminal ? req.user.id : null, req.params.id]
  );
  if (!rows[0]) throw new AppError('Open trust risk flag not found', 404, 'FLAG_NOT_FOUND');
  await audit.log(req.user.id, 'Trust Risk Flag Updated', `flagId=${rows[0].id}; status=${rows[0].status}`, req.ip);
  res.json({ flag: rows[0] });
});

module.exports = { createFlag, listFlags, updateFlag };
