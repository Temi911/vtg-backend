const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { Pool } = require('pg');
const { newDb, DataType } = require('pg-mem');

if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
  throw new Error('DATABASE_URL is required in production. Refusing to start without a production PostgreSQL database.');
}
if (!process.env.DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.warn('[db] DATABASE_URL is not set — local development may use the in-memory pg-mem fallback.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
});

let memoryPool = null;

function isDatabaseUnavailableError(err) {
  if (!err) return false;
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') return true;
  if (Array.isArray(err.errors) && err.errors.some((inner) => inner && (inner.code === 'ECONNREFUSED' || inner.code === 'ETIMEDOUT' || inner.code === 'ENOTFOUND'))) {
    return true;
  }
  const message = String(err.message || '').toLowerCase();
  return ['ecconnrefused', 'econnrefused', 'etimedout', 'enotfound', 'timeout', 'connect', 'connection'].some((needle) =>
    message.includes(needle)
  );
}

function createMemoryPool() {
  if (memoryPool) return memoryPool;

  const db = newDb({ autoCreateForeignKeyIndices: true });
  db.public.registerFunction({
    name: 'gen_random_uuid',
    returns: DataType.uuid,
    impure: true,
    implementation: () => randomUUID(),
  });

  const schemaPath = path.join(__dirname, '..', '..', 'db', 'schema.sql');
  const schema = fs
    .readFileSync(schemaPath, 'utf8')
    .replace(/CREATE EXTENSION IF NOT EXISTS "pgcrypto";\s*/i, '');

  db.public.none(schema);

  const adapter = db.adapters.createPg();
  memoryPool = new adapter.Pool();
  // eslint-disable-next-line no-console
  console.warn('[db] PostgreSQL is unavailable; using in-memory pg-mem fallback for local development.');
  return memoryPool;
}

async function getPool() {
  if (memoryPool) return memoryPool;
  return pool;
}

async function useFallbackPool(err) {
  if (!isDatabaseUnavailableError(err)) throw err;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Production PostgreSQL is unavailable; refusing to fall back to an in-memory database.');
  }
  return createMemoryPool();
}

pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[db] Unexpected error on idle client', err);
});

/**
 * Run a single query.
 * @param {string} text
 * @param {any[]} params
 */
function query(text, params) {
  return getPool()
    .then((activePool) => activePool.query(text, params))
    .catch(async (err) => {
      const fallbackPool = await useFallbackPool(err);
      return fallbackPool.query(text, params);
    });
}

/**
 * Run a set of queries inside a transaction.
 * @param {(client: import('pg').PoolClient) => Promise<any>} fn
 */
async function withTransaction(fn) {
  try {
    const activePool = await getPool();
    const client = await activePool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    const fallbackPool = await useFallbackPool(err);
    const client = await fallbackPool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (fallbackErr) {
      await client.query('ROLLBACK');
      throw fallbackErr;
    } finally {
      client.release();
    }
  }
}

module.exports = { pool, query, withTransaction };
