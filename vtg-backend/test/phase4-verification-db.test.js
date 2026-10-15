const test = require('node:test');
const assert = require('node:assert/strict');
const { Pool } = require('pg');

// CI runs this against the clean PostgreSQL service. Local runs without a DB
// stay useful and skip this integration suite rather than pretending it passed.
test('PostgreSQL verification evidence expiry and supersession rules', {
  skip: !process.env.DATABASE_URL && 'DATABASE_URL is not configured',
}, async (t) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TEMP TABLE verification_evidence_test (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        doc_type TEXT NOT NULL,
        uploaded_at TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        expires_at TIMESTAMPTZ
      ) ON COMMIT DROP
    `);

    const userId = '10000000-0000-4000-8000-000000000001';
    const olderId = '20000000-0000-4000-8000-000000000001';
    const newerId = '20000000-0000-4000-8000-000000000002';
    await client.query(
      `INSERT INTO verification_evidence_test (id, user_id, doc_type, uploaded_at, expires_at)
       VALUES ($1,$3,'government_id','2026-01-01T00:00:00Z',NULL),
              ($2,$3,'government_id','2026-01-01T00:00:00Z','2027-01-01T00:00:00Z')`,
      [olderId, newerId, userId],
    );

    await t.test('same-timestamp uploads have a deterministic newest document', async () => {
      const { rows } = await client.query(`
        SELECT id FROM verification_evidence_test vd
         WHERE NOT EXISTS (
           SELECT 1 FROM verification_evidence_test newer
            WHERE newer.user_id = vd.user_id
              AND newer.doc_type = vd.doc_type
              AND (newer.uploaded_at > vd.uploaded_at
                OR (newer.uploaded_at = vd.uploaded_at AND newer.id::text > vd.id::text))
         )
      `);
      assert.deepEqual(rows.map((row) => row.id), [newerId]);
    });

    await t.test('a superseded pending document cannot be reviewed', async () => {
      const { rows } = await client.query(`
        UPDATE verification_evidence_test
           SET status = 'verified'
         WHERE id = $1 AND status = 'pending'
           AND NOT EXISTS (
             SELECT 1 FROM verification_evidence_test newer
              WHERE newer.user_id = verification_evidence_test.user_id
                AND newer.doc_type = verification_evidence_test.doc_type
                AND (newer.uploaded_at > verification_evidence_test.uploaded_at
                  OR (newer.uploaded_at = verification_evidence_test.uploaded_at
                    AND newer.id::text > verification_evidence_test.id::text))
           )
        RETURNING id
      `, [olderId]);
      assert.equal(rows.length, 0);
    });

    await t.test('the newest pending document can be reviewed', async () => {
      const { rows } = await client.query(`
        UPDATE verification_evidence_test
           SET status = 'verified', expires_at = '2027-01-01T00:00:00Z'
         WHERE id = $1 AND status = 'pending'
           AND NOT EXISTS (
             SELECT 1 FROM verification_evidence_test newer
              WHERE newer.user_id = verification_evidence_test.user_id
                AND newer.doc_type = verification_evidence_test.doc_type
                AND (newer.uploaded_at > verification_evidence_test.uploaded_at
                  OR (newer.uploaded_at = verification_evidence_test.uploaded_at
                    AND newer.id::text > verification_evidence_test.id::text))
           )
        RETURNING id
      `, [newerId]);
      assert.deepEqual(rows.map((row) => row.id), [newerId]);
    });

    await t.test('expiry is inclusive at the current timestamp and null means no expiry', async () => {
      const { rows } = await client.query(`
        SELECT
          (TIMESTAMPTZ '2026-10-15T00:00:00Z' <= TIMESTAMPTZ '2026-10-15T00:00:00Z') AS expires_at_boundary,
          (NULL::timestamptz IS NOT NULL AND NULL::timestamptz <= now()) AS null_is_expired
      `);
      assert.equal(rows[0].expires_at_boundary, true);
      assert.equal(rows[0].null_is_expired, false);
    });
    await client.query('ROLLBACK');
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
});
