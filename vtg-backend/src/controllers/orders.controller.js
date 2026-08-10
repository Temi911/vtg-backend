const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const { withTransaction, query } = require('../config/db');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');
const audit = require('../services/audit.service');
const { notify } = require('../services/notification.service');

function generateReference() {
  const year = new Date().getFullYear();
  const suffix = uuidv4().slice(0, 6).toUpperCase();
  return `VTG-${year}-${suffix}`;
}

const createOrderSchema = z.object({
  supplierId: z.string().uuid(),
  items: z.array(
    z.object({
      productId: z.string().uuid().optional(),
      description: z.string().min(1),
      quantity: z.number().int().positive(),
      unitPriceUsd: z.number().positive(),
    })
  ).min(1),
  incoterm: z.string().optional(),
  notes: z.string().optional(),
});

const create = asyncHandler(async (req, res) => {
  const data = createOrderSchema.parse(req.body);
  const reference = generateReference();
  const totalAmount = data.items.reduce((sum, i) => sum + i.quantity * i.unitPriceUsd, 0);

  const order = await withTransaction(async (client) => {
    const orderRes = await client.query(
      `INSERT INTO orders (reference, buyer_id, supplier_id, total_amount_usd, incoterm, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [reference, req.user.id, data.supplierId, totalAmount, data.incoterm || 'FOB', data.notes || null]
    );
    const newOrder = orderRes.rows[0];

    for (const item of data.items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, description, quantity, unit_price_usd)
         VALUES ($1,$2,$3,$4,$5)`,
        [newOrder.id, item.productId || null, item.description, item.quantity, item.unitPriceUsd]
      );
    }

    // Conversation thread between buyer & supplier for this order
    const convRes = await client.query('INSERT INTO conversations (order_id) VALUES ($1) RETURNING id', [newOrder.id]);
    await client.query('INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1,$2),($1,$3)', [
      convRes.rows[0].id,
      req.user.id,
      data.supplierId,
    ]);

    return newOrder;
  });

  await audit.log(req.user.id, 'Order Created', `Order ${reference} created ($${totalAmount})`, req.ip);
  await notify(order.supplier_id, 'New Order Received', `Order ${reference} for $${totalAmount} — awaiting your confirmation.`);
  res.status(201).json({ order });
});

const listMine = asyncHandler(async (req, res) => {
  const column = req.user.role === 'buyer' ? 'buyer_id' : req.user.role === 'supplier' ? 'supplier_id' : 'bank_id';
  const { rows } = await query(
    `SELECT o.*, bu.full_name AS buyer_name, su.full_name AS supplier_name
     FROM orders o
     JOIN users bu ON bu.id = o.buyer_id
     JOIN users su ON su.id = o.supplier_id
     WHERE o.${column} = $1
     ORDER BY o.created_at DESC`,
    [req.user.id]
  );
  res.json({ orders: rows });
});

const getOne = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM orders WHERE id = $1 OR reference = $1', [req.params.id]);
  const order = rows[0];
  if (!order) throw new AppError('Order not found', 404);
  if (![order.buyer_id, order.supplier_id, order.bank_id].includes(req.user.id) && req.user.role !== 'admin') {
    throw new AppError('You do not have access to this order', 403, 'FORBIDDEN');
  }
  const items = await query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
  res.json({ order, items: items.rows });
});

const updateStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'lc_issued', 'shipped', 'in_transit', 'arrived', 'customs', 'delivered', 'cancelled', 'disputed']),
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status } = updateStatusSchema.parse(req.body);
  const existing = await query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  if (!existing.rows[0]) throw new AppError('Order not found', 404);
  const order = existing.rows[0];
  if (![order.buyer_id, order.supplier_id, order.bank_id].includes(req.user.id) && req.user.role !== 'admin') {
    throw new AppError('You do not have access to this order', 403, 'FORBIDDEN');
  }

  const { rows } = await query('UPDATE orders SET status = $1, updated_at = now() WHERE id = $2 RETURNING *', [status, req.params.id]);
  await audit.log(req.user.id, 'Order Status Updated', `Order ${order.reference} -> ${status}`, req.ip);
  const otherParty = req.user.id === order.buyer_id ? order.supplier_id : order.buyer_id;
  await notify(otherParty, 'Order Status Updated', `Order ${order.reference} is now "${status.replace(/_/g, ' ')}".`);
  res.json({ order: rows[0] });
});

module.exports = { create, listMine, getOne, updateStatus };
