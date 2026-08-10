require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const DEMO_PASSWORD = 'Password123';

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  console.log('Seeding forex rates & country compliance ...');
  const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
  await pool.query(seedSql);

  console.log('Creating demo users ...');

  // ── Buyer (Temi, individual) ──
  const buyer = await pool.query(
    `INSERT INTO users (email, phone, password_hash, role, full_name, is_verified)
     VALUES ('buyer@demo.vtg','+2348012345678',$1,'buyer','Temitope Adebayo', true)
     ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
     RETURNING id`,
    [passwordHash]
  );
  const buyerId = buyer.rows[0].id;
  await pool.query(
    `INSERT INTO buyer_profiles (user_id, buyer_type, company_name, bank_name)
     VALUES ($1,'individual', NULL, 'GTBank')
     ON CONFLICT (user_id) DO NOTHING`,
    [buyerId]
  );
  for (const [currency, balance] of [['USD', 12400], ['NGN', 3400000], ['CNY', 41200]]) {
    await pool.query(
      `INSERT INTO wallet_accounts (user_id, currency, balance) VALUES ($1,$2,$3)
       ON CONFLICT (user_id, currency) DO UPDATE SET balance = EXCLUDED.balance`,
      [buyerId, currency, balance]
    );
  }

  // ── Supplier (HOPTOP Motors) ──
  const supplier = await pool.query(
    `INSERT INTO users (email, phone, password_hash, role, full_name, is_verified)
     VALUES ('supplier@demo.vtg','+8613800000000',$1,'supplier','Li Wei (HOPTOP Motors)', true)
     ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
     RETURNING id`,
    [passwordHash]
  );
  const supplierId = supplier.rows[0].id;
  await pool.query(
    `INSERT INTO supplier_profiles (user_id, company_name, city, country, swift_code, verified_supplier, rating)
     VALUES ($1,'HOPTOP Motors Co. Ltd','Guangzhou','China','HOPTCNBJ', true, 4.6)
     ON CONFLICT (user_id) DO NOTHING`,
    [supplierId]
  );

  // ── Bank officer (Zenith Bank trade desk) ──
  const bank = await pool.query(
    `INSERT INTO users (email, phone, password_hash, role, full_name, is_verified)
     VALUES ('bank@demo.vtg','+2348099999999',$1,'bank','Chidi Okafor', true)
     ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
     RETURNING id`,
    [passwordHash]
  );
  const bankId = bank.rows[0].id;
  await pool.query(
    `INSERT INTO bank_profiles (user_id, bank_name, swift_code, branch, officer_name, officer_title)
     VALUES ($1,'Zenith Bank','ZEIBNGLA','Victoria Island','Chidi Okafor','Trade Finance Officer')
     ON CONFLICT (user_id) DO NOTHING`,
    [bankId]
  );

  console.log('Creating demo product ...');
  const product = await pool.query(
    `INSERT INTO products (supplier_id, name, category, unit_price_usd, min_order_qty, hs_code, lead_time, description, is_verified)
     VALUES ($1,'HOPTOP 6x4 Dump Truck','Vehicles',32000,'1 unit','8704','30-45 days','25-ton payload, Cummins engine, verified export-ready.', true)
     RETURNING id`,
    [supplierId]
  );
  const productId = product.rows[0].id;

  console.log('Creating demo order ...');
  const order = await pool.query(
    `INSERT INTO orders (reference, buyer_id, supplier_id, bank_id, status, total_amount_usd, incoterm)
     VALUES ('VTG-2024-010',$1,$2,$3,'lc_issued',96000,'FOB')
     ON CONFLICT (reference) DO NOTHING
     RETURNING id`,
    [buyerId, supplierId, bankId]
  );
  const orderId = order.rows[0]?.id;

  if (orderId) {
    await pool.query(
      `INSERT INTO order_items (order_id, product_id, description, quantity, unit_price_usd)
       VALUES ($1,$2,'HOPTOP 6x4 Dump Truck',3,32000)`,
      [orderId, productId]
    );

    console.log('Creating demo Letter of Credit ...');
    await pool.query(
      `INSERT INTO letters_of_credit (reference, order_id, buyer_id, supplier_id, issuing_bank_id, issuing_bank_name, amount_usd, status, swift_mt700_ref, expiry_date)
       VALUES ('VTG-LC-2024-007',$1,$2,$3,$4,'Zenith Bank',96000,'issued','MT700-DEMO0001','2026-12-31')`,
      [orderId, buyerId, supplierId, bankId]
    );

    console.log('Creating demo shipment & tracking events ...');
    const shipment = await pool.query(
      `INSERT INTO shipments (order_id, container_no, carrier, origin_port, destination_port, percent_complete)
       VALUES ($1,'CNGZH-88213','COSCO Shipping','Guangzhou Port, China','Tin Can Island, Lagos',65)
       RETURNING id`,
      [orderId]
    );
    const shipmentId = shipment.rows[0].id;

    const events = [
      ['Guangzhou Port, China', 'Departed 01 Jun 2026', 'done', 1],
      ['Singapore Transshipment', 'Passed through 10 Jun 2026', 'done', 2],
      ['Indian Ocean', 'Currently in transit', 'active', 3],
      ['Tin Can Island, Lagos', 'ETA 11 Jul 2026', 'pending', 4],
      ['Customs Clearance (FGR)', 'Pending arrival', 'pending', 5],
      ['Final Delivery', 'Pending clearance', 'pending', 6],
    ];
    for (const [location, detail, status, sortOrder] of events) {
      await pool.query(
        `INSERT INTO tracking_events (shipment_id, location, detail, status, sort_order) VALUES ($1,$2,$3,$4,$5)`,
        [shipmentId, location, detail, status, sortOrder]
      );
    }
  }

  console.log('\nSeed complete. Demo logins (all use the same password):');
  console.log(`  buyer@demo.vtg    / ${DEMO_PASSWORD}`);
  console.log(`  supplier@demo.vtg / ${DEMO_PASSWORD}`);
  console.log(`  bank@demo.vtg     / ${DEMO_PASSWORD}`);

  await pool.end();
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
