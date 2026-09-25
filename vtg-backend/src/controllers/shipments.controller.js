const { z } = require('zod');
const { query, withTransaction } = require('../config/db');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');
const { locations: atlasLocations } = require('../../api/atlas-locations');
const { getLiveVesselPosition } = require('../services/vessel-tracking.service');

function resolveAtlasLocation(text) {
  const value = String(text || '').trim().toLowerCase();
  if (!value) return null;
  const exact = atlasLocations.find(x =>
    [x.name, x.city, x.code].some(v => String(v).toLowerCase() === value)
  );
  if (exact) return exact;
  return atlasLocations.find(x => {
    const hay = `${x.name} ${x.city} ${x.country} ${x.code}`.toLowerCase();
    return hay.includes(value) || value.includes(String(x.name).toLowerCase()) || value.includes(String(x.city).toLowerCase());
  }) || null;
}

function mapShipmentStatus(orderStatus, percentComplete) {
  if (orderStatus === 'delivered') return 'delivered';
  if (orderStatus === 'cancelled') return 'cancelled';
  if (orderStatus === 'disputed') return 'attention';
  if (orderStatus === 'customs' || orderStatus === 'arrived') return 'arrived';
  if (orderStatus === 'in_transit' || orderStatus === 'shipped') return percentComplete > 0 ? 'in_transit' : 'shipped';
  return orderStatus || 'pending';
}

const listForAtlas = asyncHandler(async (req, res) => {
  const params = [req.user.id];
  let access = '';
  if (req.user.role === 'admin') {
    access = '';
    params.length = 0;
  } else if (req.user.role === 'buyer') {
    access = 'WHERE o.buyer_id = $1';
  } else if (req.user.role === 'supplier') {
    access = 'WHERE o.supplier_id = $1';
  } else if (req.user.role === 'bank') {
    access = 'WHERE o.bank_id = $1';
  } else {
    throw new AppError('Unsupported role', 403, 'FORBIDDEN');
  }

  const shipmentsRes = await query(
    `SELECT s.*, o.reference, o.status AS order_status, o.buyer_id, o.supplier_id,
            bu.full_name AS buyer_name, su.full_name AS supplier_name
     FROM shipments s
     JOIN orders o ON o.id = s.order_id
     JOIN users bu ON bu.id = o.buyer_id
     JOIN users su ON su.id = o.supplier_id
     ${access}
     ORDER BY s.created_at DESC
     LIMIT 100`,
    params
  );

  const ids = shipmentsRes.rows.map(x => x.id);
  if (!ids.length) return res.json({ ok: true, count: 0, shipments: [] });

  const eventsRes = await query(
    `SELECT * FROM tracking_events
     WHERE shipment_id = ANY($1::uuid[])
     ORDER BY shipment_id, sort_order ASC, event_time ASC`,
    [ids]
  );
  const eventsByShipment = new Map();
  for (const event of eventsRes.rows) {
    if (!eventsByShipment.has(event.shipment_id)) eventsByShipment.set(event.shipment_id, []);
    eventsByShipment.get(event.shipment_id).push(event);
  }

  const shipments = shipmentsRes.rows.map(s => {
    const rawEvents = eventsByShipment.get(s.id) || [];
    const points = [];

    const origin = resolveAtlasLocation(s.origin_port);
    if (origin) points.push({
      type: 'origin',
      name: origin.name,
      city: origin.city,
      country: origin.country,
      lat: origin.lat,
      lng: origin.lng
    });

    for (const e of rawEvents) {
      const loc = resolveAtlasLocation(e.location);
      if (!loc) continue;
      const previous = points[points.length - 1];
      if (previous && previous.lat === loc.lat && previous.lng === loc.lng) continue;
      points.push({
        type: e.status === 'active' ? 'active' : 'milestone',
        name: loc.name,
        city: loc.city,
        country: loc.country,
        lat: loc.lat,
        lng: loc.lng,
        eventId: e.id,
        status: e.status,
        detail: e.detail,
        eventTime: e.event_time
      });
    }

    const destination = resolveAtlasLocation(s.destination_port);
    if (destination) {
      const previous = points[points.length - 1];
      if (!previous || previous.lat !== destination.lat || previous.lng !== destination.lng) {
        points.push({
          type: 'destination',
          name: destination.name,
          city: destination.city,
          country: destination.country,
          lat: destination.lat,
          lng: destination.lng
        });
      }
    }

    return {
      id: s.id,
      orderId: s.order_id,
      reference: s.reference,
      containerNo: s.container_no,
      carrier: s.carrier,
      originPort: s.origin_port,
      destinationPort: s.destination_port,
      percentComplete: s.percent_complete,
      status: mapShipmentStatus(s.order_status, s.percent_complete),
      buyerName: req.user.role === 'admin' || req.user.role === 'buyer' ? s.buyer_name : null,
      supplierName: req.user.role === 'admin' || req.user.role === 'supplier' ? s.supplier_name : null,
      milestones: rawEvents.map(e => ({
        id: e.id,
        location: e.location,
        detail: e.detail,
        status: e.status,
        eventTime: e.event_time,
        sortOrder: e.sort_order,
        coordinates: resolveAtlasLocation(e.location) ? {
          lat: resolveAtlasLocation(e.location).lat,
          lng: resolveAtlasLocation(e.location).lng,
          name: resolveAtlasLocation(e.location).name
        } : null
      })),
      routePoints: points
    };
  }).filter(s => s.routePoints.length >= 2);

  res.json({ ok: true, count: shipments.length, shipments });
});

const getLiveTracking = asyncHandler(async (req, res) => {
  const shipmentRes = await query(
    `SELECT s.*, o.buyer_id, o.supplier_id
     FROM shipments s
     JOIN orders o ON o.id = s.order_id
     WHERE s.id = $1
     LIMIT 1`,
    [req.params.shipmentId]
  );
  const shipment = shipmentRes.rows[0];
  if (!shipment) throw new AppError('Shipment not found', 404);

  const allowed =
    req.user.role === 'admin' ||
    (req.user.role === 'buyer' && shipment.buyer_id === req.user.id) ||
    (req.user.role === 'supplier' && shipment.supplier_id === req.user.id) ||
    (req.user.role === 'bank' && await (async () => {
      const r = await query('SELECT bank_id FROM orders WHERE id = $1', [shipment.order_id]);
      return r.rows[0]?.bank_id === req.user.id;
    })());
  if (!allowed) throw new AppError('Forbidden', 403, 'FORBIDDEN');

  const tracking = await getLiveVesselPosition({
    vesselName: shipment.vessel_name,
    imo: shipment.vessel_imo,
    mmsi: shipment.vessel_mmsi
  });

  res.json({
    ok: true,
    shipmentId: shipment.id,
    provider: tracking.provider,
    available: tracking.available,
    reason: tracking.reason || null,
    vessel: tracking.vessel || null,
    nextMilestone: shipment.destination_port || null
  });
});

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

module.exports = { create, getForOrder, addEvent, listForAtlas, getLiveTracking };
