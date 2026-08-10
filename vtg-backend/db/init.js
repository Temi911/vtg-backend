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
  await pool.query(schema);
  console.log('Schema applied successfully.');

  await pool.end();
}

main().catch((err) => {
  console.error('Failed to initialize database:', err.message);
  process.exit(1);
});
