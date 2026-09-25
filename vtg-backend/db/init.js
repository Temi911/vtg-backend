require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  console.log('Applying schema.sql ...');
  // Make the bootstrap safe to run on every Railway deploy.
  const safeSchema = schema
    .replace(/CREATE TYPE\s+([A-Za-z_][\w]*)\s+AS ENUM\s*\(([\s\S]*?)\);/g, function (_, name, values) {
      return 'DO $$ BEGIN CREATE TYPE ' + name + ' AS ENUM (' + values + '); EXCEPTION WHEN duplicate_object THEN NULL; END $$;';
    })
    .replace(/CREATE TABLE\s+(?!IF NOT EXISTS)/g, 'CREATE TABLE IF NOT EXISTS ')
    .replace(/CREATE INDEX\s+(?!IF NOT EXISTS)/g, 'CREATE INDEX IF NOT EXISTS ');

  await pool.query(safeSchema);
  console.log('Schema applied successfully.');

  await pool.end();
}

main().catch((err) => {
  console.error('Failed to initialize database:', err.message);
  process.exit(1);
});
