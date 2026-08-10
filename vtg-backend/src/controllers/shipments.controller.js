const { z } = require('zod');
const { query, withTransaction } = require('../config/db');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');
const audit = require('../services/audit.service');

const createSchema = z.object({
  orderId: z.string().uuid(),
  containerNo: z.string().optional(),
  carrier: z.string().optional(),
  originPort: z.string().optional(),
  destinationPort: z.string().optional(),
});

const create = asyncHandler(async (req, res) => {
  const data = createSchema.parse(req.body);
  const { rows } = await query(
    `INSERT INTO shipments (order_id, container_no, carrier, origin_port, destination_port)
     VALUES ($1,$2,$3,$4,COALESCE($5,'Tin Can Island, Lagos')) RETURNING *`,
    [data.orderId, data.containerNo || null, data.carrier || null, data.originPort || null, data.destinationPort || null]
  );
  await audit.log(req.user.id, 'Shipment Created', `Shipment created for order ${data.orderId}`, req.ip);
  res.status(201).json({ shipment: rows[0] });
});

const getForOrder = asyncHandler(async (req, res) => {
  const shipmentRes = await query('SELECT * FROM shipments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1', [req.params.orderId]);
  const shipment = shipmentRes.rows[0];
  if (!shipment) throw new AppError('No shipment found for this order', 404);
  const events = await query('SELECT * FROM tracking_events WHERE shipment_id = $1 ORDER BY sort_order ASC', [shipment.id]);
  res.json({ shipment, events: events.rows });
});

const addEventSchema = z.object({
  location: z.string().min(1),
  detail: z.string().optional(),
  status: z.enum(['done', 'active', 'pending']).default('pending'),
  sortOrder: z.number().int().optional(),
  percentComplete: z.number().int().min(0).max(100).optional(),
});

const addEvent = asyncHandler(async (req, res) => {
  const data = addEventSchema.parse(req.body);
  const result = await withTransaction(async (client) => {
    const evRes = await client.query(
      `INSERT INTO tracking_events (shipment_id, location, detail, status, sort_order)
       VALUES ($1,$2,$3,$4,COALESCE($5,0)) RETURNING *`,
      [req.params.shipmentId, data.location, data.detail || null, data.status, data.sortOrder]
    );
    if (data.percentComplete !== undefined) {
      await client.query('UPDATE shipments SET percent_complete = $1 WHERE id = $2', [data.percentComplete, req.params.shipmentId]);
    }
    return evRes.rows[0];
  });
  await audit.log(req.user.id, 'Tracking Updated', `${data.location} — ${data.status}`, req.ip);
  res.status(201).json({ event: result });
});

module.exports = { create, getForOrder, addEvent };
