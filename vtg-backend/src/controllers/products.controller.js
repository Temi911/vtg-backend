const { z } = require('zod');
const { query } = require('../config/db');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');

const productSchema = z.object({
  name: z.string().min(2),
  category: z.string().optional(),
  unitPriceUsd: z.number().positive(),
  minOrderQty: z.string().optional(),
  hsCode: z.string().optional(),
  leadTime: z.string().optional(),
  description: z.string().optional(),
});

// GET /products — public browse (buyers), optional ?category=&supplierId=
const list = asyncHandler(async (req, res) => {
  const { category, supplierId } = req.query;
  const conditions = ['p.is_active = TRUE'];
  const params = [];

  if (category) {
    params.push(category);
    conditions.push(`p.category = $${params.length}`);
  }
  if (supplierId) {
    params.push(supplierId);
    conditions.push(`p.supplier_id = $${params.length}`);
  }

  const { rows } = await query(
    `SELECT p.*, sp.company_name AS supplier_name, sp.verified_supplier, sp.rating
     FROM products p
     JOIN supplier_profiles sp ON sp.user_id = p.supplier_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY p.created_at DESC`,
    params
  );
  res.json({ products: rows });
});

const getOne = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT p.*, sp.company_name AS supplier_name, sp.verified_supplier, sp.rating
     FROM products p JOIN supplier_profiles sp ON sp.user_id = p.supplier_id
     WHERE p.id = $1`,
    [req.params.id]
  );
  if (!rows[0]) throw new AppError('Product not found', 404);
  res.json({ product: rows[0] });
});

// POST /products — supplier only
const create = asyncHandler(async (req, res) => {
  const data = productSchema.parse(req.body);
  const { rows } = await query(
    `INSERT INTO products (supplier_id, name, category, unit_price_usd, min_order_qty, hs_code, lead_time, description)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.user.id, data.name, data.category || null, data.unitPriceUsd, data.minOrderQty || null, data.hsCode || null, data.leadTime || null, data.description || null]
  );
  res.status(201).json({ product: rows[0] });
});

// GET /products/mine — supplier's own catalogue (any status)
const listMine = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM products WHERE supplier_id = $1 ORDER BY created_at DESC', [req.user.id]);
  res.json({ products: rows });
});

const update = asyncHandler(async (req, res) => {
  const existing = await query('SELECT * FROM products WHERE id = $1', [req.params.id]);
  if (!existing.rows[0]) throw new AppError('Product not found', 404);
  if (existing.rows[0].supplier_id !== req.user.id) throw new AppError('Not your product', 403, 'FORBIDDEN');

  const data = productSchema.partial().parse(req.body);
  const { rows } = await query(
    `UPDATE products SET
       name = COALESCE($1, name), category = COALESCE($2, category),
       unit_price_usd = COALESCE($3, unit_price_usd), min_order_qty = COALESCE($4, min_order_qty),
       hs_code = COALESCE($5, hs_code), lead_time = COALESCE($6, lead_time), description = COALESCE($7, description)
     WHERE id = $8 RETURNING *`,
    [data.name, data.category, data.unitPriceUsd, data.minOrderQty, data.hsCode, data.leadTime, data.description, req.params.id]
  );
  res.json({ product: rows[0] });
});

const remove = asyncHandler(async (req, res) => {
  const existing = await query('SELECT * FROM products WHERE id = $1', [req.params.id]);
  if (!existing.rows[0]) throw new AppError('Product not found', 404);
  if (existing.rows[0].supplier_id !== req.user.id) throw new AppError('Not your product', 403, 'FORBIDDEN');
  await query('UPDATE products SET is_active = FALSE WHERE id = $1', [req.params.id]);
  res.status(204).send();
});

module.exports = { list, getOne, create, listMine, update, remove };
