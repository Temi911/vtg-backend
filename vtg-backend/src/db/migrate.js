const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run database migrations.');
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const dir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(dir)
      .filter((name) => /^\d+.*\.sql$/i.test(name))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    for (const file of files) {
      const already = await client.query(
        'SELECT 1 FROM schema_migrations WHERE id = $1',
        [file]
      );
      if (already.rowCount) continue;

      // The repository historically bootstrapped the database with db/schema.sql.
      // If that baseline already exists but schema_migrations is empty, do not replay
      // 001_baseline.sql (its CREATE TYPE statements are intentionally not idempotent).
      if (file === '001_baseline.sql') {
        const baseline = await client.query(
          "SELECT 1 FROM pg_type WHERE typname = 'user_role' LIMIT 1"
        );
        if (baseline.rowCount) {
          await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file]);
          console.log('Baseline schema already exists; marked 001_baseline.sql as applied.');
          continue;
        }
      }

      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (id) VALUES ($1)',
        [file]
      );
      console.log(`Applied migration: ${file}`);
    }

    await client.query('COMMIT');
    console.log('Database migrations complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Database migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = main;
