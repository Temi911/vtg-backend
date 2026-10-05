const { z } = require('zod');
const { query, withTransaction } = require('../config/db');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');
const audit = require('../services/audit.service');

const deliverySchema = z.object({
  status: z.enum(['pending', 'confirmed', 'disputed']).default('pending'),
  recipientName: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(2000).optional(),
  proofDocumentId: z.string().uuid().optional(),
});

async function getShipment(shipmentId) {
  const { rows } = await query(
    \`SELECT s.id, s.order_id, s.percent_complete,
            o.status AS order_status, o.buyer_id, o.supplier_id, o.bank_id
       FROM shipments s JOIN orders o ON o.id = s.order_id
      WHERE s.id = $1 LIMIT 1\`,
    [shipmentId]
  );
  if (!rows[0]) throw new AppError('Shipment not found', 404);
  return rows[0];
}

function canView(shipment, user) {
  return user.role === 'admin' || [shipment.buyer_id, shipment.supplier_id, shipment.bank_id].includes(user.id);
}

const getDelivery = asyncHandler(async (req, res) => {
  const shipment = await getShipment(req.params.shipmentId);
  if (!canView(shipment, req.user)) throw new AppError('Forbidden', 403, 'FORBIDDEN');
  const { rows } = await query('SELECT * FROM shipment_delivery WHERE shipment_id = $1 LIMIT 1', [shipment.id]);
  res.json({ delivery: rows[0] || null });
});

const updateDelivery = asyncHandler(async (req, res) => {
  const data = deliverySchema.parse(req.body || {});
  const result = await withTransaction(async (client) => {
    const shipmentRes = await client.query(
      \`SELECT s.*, o.status AS order_status, o.buyer_id, o.supplier_id, o.bank_id
         FROM shipments s JOIN orders o ON o.id = s.order_id
        WHERE s.id = $1 FOR UPDATE\`,
      [req.params.shipmentId]
    );
    const shipment = shipmentRes.rows[0];
    if (!shipment) throw new AppError('Shipment not found', 404);
    if (!canView(shipment, req.user)) throw new AppError('You do not have access to this shipment', 403, 'FORBIDDEN');
    if (['delivered', 'cancelled'].includes(shipment.order_status)) throw new AppError('Shipment is closed', 409, 'ORDER_CLOSED');

    const privileged = req.user.role === 'admin';
    const buyerCanFinalize = privileged || (req.user.role === 'buyer' && shipment.buyer_id === req.user.id);
    if (data.status !== 'pending' && !buyerCanFinalize) {
      throw new AppError('Only the buyer or an administrator can confirm or dispute delivery', 403, 'FORBIDDEN');
    }

    if (data.status === 'confirmed') {
      const customsRes = await client.query('SELECT status FROM shipment_customs WHERE shipment_id = $1 LIMIT 1', [shipment.id]);
      if (customsRes.rows[0]?.status !== 'released') {
        throw new AppError('Customs must be released before delivery can be confirmed', 409, 'CUSTOMS_NOT_RELEASED');
      }
      if (!['arrived', 'customs'].includes(shipment.order_status)) {
        throw new AppError('Order must be at the arrived/customs stage before delivery can be confirmed', 409, 'INVALID_ORDER_TRANSITION');
      }
    }
    if (data.status === 'disputed' && !['confirmed', 'lc_issued', 'shipped', 'in_transit', 'arrived', 'customs', 'disputed'].includes(shipment.order_status)) {
      throw new AppError('Delivery can only be disputed after the order has entered execution', 409, 'INVALID_ORDER_TRANSITION');
    }

    const existingRes = await client.query('SELECT * FROM shipment_delivery WHERE shipment_id = $1 LIMIT 1', [shipment.id]);
    const existing = existingRes.rows[0];
    if (existing?.status === 'confirmed' && !privileged) throw new AppError('Confirmed delivery cannot be changed', 409, 'DELIVERY_CONFIRMED');

    if (data.status === 'confirmed' && !data.proofDocumentId && !existing?.proof_document_id) {
      throw new AppError('A proof-of-delivery document is required before delivery can be confirmed', 400, 'PROOF_OF_DELIVERY_REQUIRED');
    }

    if (data.proofDocumentId) {
      const docRes = await client.query('SELECT id, order_id, doc_type FROM documents WHERE id = $1 LIMIT 1', [data.proofDocumentId]);
      const doc = docRes.rows[0];
      if (!doc) throw new AppError('Proof document not found', 404, 'DOCUMENT_NOT_FOUND');
      if (doc.order_id !== shipment.order_id || doc.doc_type !== 'proof_of_delivery') {
        throw new AppError('Proof document must belong to this order and be a proof-of-delivery document', 400, 'INVALID_PROOF_DOCUMENT');
      }
    }

    const confirmedAt = data.status === 'confirmed'
      ? (existing?.confirmed_at || new Date())
      : (data.status === 'pending' ? null : existing?.confirmed_at || null);

    const deliveryRes = await client.query(
      \`INSERT INTO shipment_delivery
         (shipment_id, status, recipient_name, notes, proof_document_id, confirmed_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       ON CONFLICT (shipment_id) DO UPDATE SET
         status = EXCLUDED.status,
         recipient_name = COALESCE(EXCLUDED.recipient_name, shipment_delivery.recipient_name),
         notes = COALESCE(EXCLUDED.notes, shipment_delivery.notes),
         proof_document_id = COALESCE(EXCLUDED.proof_document_id, shipment_delivery.proof_document_id),
         confirmed_at = EXCLUDED.confirmed_at,
         updated_at = NOW()
       RETURNING *\`,
      [shipment.id, data.status, data.recipientName || null, data.notes || null, data.proofDocumentId || null, confirmedAt]
    );

    const statusChanged = !existing || existing.status !== data.status;
    const eventStatus = data.status === 'confirmed' ? 'done' : data.status === 'disputed' ? 'active' : 'pending';
    const eventPercent = data.status === 'confirmed' ? 100 : Math.max(Number(shipment.percent_complete || 0), 95);
    const eventDetail = data.status === 'confirmed' ? 'Final delivery confirmed' : data.status === 'disputed' ? 'Final delivery disputed' : 'Final delivery pending confirmation';

    if (statusChanged) {
      const latestEventRes = await client.query(
        'SELECT COALESCE(MAX(sort_order), -1) AS max_sort FROM tracking_events WHERE shipment_id = $1',
        [shipment.id]
      );
      const sortOrder = Number(latestEventRes.rows[0].max_sort) + 1;

      await client.query(
        `INSERT INTO tracking_events (shipment_id, location, detail, status, stage, sort_order)
         VALUES ($1,$2,$3,$4,'delivery',$5)`,
        [shipment.id, 'Final delivery', eventDetail, eventStatus, sortOrder]
      );
    }

    await client.query(
      'UPDATE shipments SET percent_complete = GREATEST(percent_complete, $1), updated_at = NOW() WHERE id = $2',
      [eventPercent, shipment.id]
    );

    if (data.status === 'confirmed') {
      await client.query(\`UPDATE orders SET status = 'delivered', updated_at = NOW()
        WHERE id = $1 AND status NOT IN ('cancelled', 'delivered')\`, [shipment.order_id]);
    } else if (data.status === 'disputed') {
      await client.query(\`UPDATE orders SET status = 'disputed', updated_at = NOW()
        WHERE id = $1 AND status NOT IN ('cancelled', 'delivered')\`, [shipment.order_id]);
    }

    return deliveryRes.rows[0];
  });

  await audit.log(req.user.id, 'Delivery Updated', \`Shipment \${req.params.shipmentId} delivery -> \${result.status}\`, req.ip);
  res.json({ delivery: result });
});

module.exports = { getDelivery, updateDelivery };
