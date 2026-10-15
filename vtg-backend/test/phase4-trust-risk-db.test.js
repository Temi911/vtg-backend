const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Pool } = require('pg');

const enabled = Boolean(process.env.DATABASE_URL && process.env.NODE_ENV === 'test');

test('trust-risk migration enforces foreign keys, constraints, filters and one terminal decision', { skip: !enabled }, async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const suffix = randomUUID();
  let adminId;
  let subjectId;
  let flagId;
  try {
    const admin = await pool.query(
      'INSERT INTO users (email,password_hash,role,full_name) VALUES ($1,$2,$3,$4) RETURNING id',
      [`phase4-admin-${suffix}@example.test`, 'test-hash', 'admin', 'Phase 4 Test Admin']
    );
    adminId = admin.rows[0].id;
    const subject = await pool.query(
      'INSERT INTO users (email,password_hash,role,full_name) VALUES ($1,$2,$3,$4) RETURNING id',
      [`phase4-subject-${suffix}@example.test`, 'test-hash', 'buyer', 'Phase 4 Test Subject']
    );
    subjectId = subject.rows[0].id;

    await assert.rejects(
      pool.query(
        `INSERT INTO trust_risk_flags (subject_user_id,created_by,category,severity,source_type,rationale)
         VALUES ($1,$2,'test flag','urgent','internal_review','This rationale is long enough')`,
        [subjectId, adminId]
      ),
      (error) => error.code === '23514'
    );
    await assert.rejects(
      pool.query(
        `INSERT INTO trust_risk_flags (subject_user_id,created_by,category,severity,source_type,rationale)
         VALUES ($1,$2,'test flag','high','internal_review','This rationale is long enough')`,
        [randomUUID(), adminId]
      ),
      (error) => error.code === '23503'
    );

    const inserted = await pool.query(
      `INSERT INTO trust_risk_flags
        (subject_user_id,created_by,category,severity,source_type,source_reference,rationale)
       VALUES ($1,$2,'test flag','high','internal_review','phase4-test','Evidence-based test rationale')
       RETURNING id,status`,
      [subjectId, adminId]
    );
    flagId = inserted.rows[0].id;
    assert.equal(inserted.rows[0].status, 'open');

    await assert.rejects(
      pool.query(`UPDATE trust_risk_flags SET status='resolved' WHERE id=$1`, [flagId]),
      (error) => error.code === '23514'
    );

    const filtered = await pool.query(
      'SELECT id FROM trust_risk_flags WHERE status=$1 AND severity=$2 AND subject_user_id=$3',
      ['open', 'high', subjectId]
    );
    assert.deepEqual(filtered.rows.map((row) => row.id), [flagId]);

    const terminalDecision = async (status, note) => pool.query(
      `UPDATE trust_risk_flags
          SET status=$1,resolution_notes=$2,resolved_by=$3,resolved_at=now(),updated_at=now()
        WHERE id=$4 AND status IN ('open','reviewing')
        RETURNING id,status`,
      [status, note, adminId, flagId]
    );
    const decisions = await Promise.all([
      terminalDecision('resolved', 'Resolution accepted'),
      terminalDecision('dismissed', 'Flag dismissed after review')
    ]);
    assert.equal(decisions.reduce((count, result) => count + result.rowCount, 0), 1);
    const final = await pool.query(
      'SELECT status,resolved_by,resolved_at,resolution_notes FROM trust_risk_flags WHERE id=$1',
      [flagId]
    );
    assert.ok(['resolved', 'dismissed'].includes(final.rows[0].status));
    assert.equal(final.rows[0].resolved_by, adminId);
    assert.ok(final.rows[0].resolved_at);
    assert.ok(final.rows[0].resolution_notes.length >= 5);
  } finally {
    if (flagId) await pool.query('DELETE FROM trust_risk_flags WHERE id=$1', [flagId]).catch(() => {});
    if (subjectId) await pool.query('DELETE FROM users WHERE id=$1', [subjectId]).catch(() => {});
    if (adminId) await pool.query('DELETE FROM users WHERE id=$1', [adminId]).catch(() => {});
    await pool.end();
  }
});
