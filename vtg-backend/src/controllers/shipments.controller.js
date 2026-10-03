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

function journeySummary(rawEvents, origin, destination) {
  const resolvePoint = (event) => {
    const loc = resolveAtlasLocation(event.location);
    return loc ? {
      name: loc.name, city: loc.city, country: loc.country,
      lat: loc.lat, lng: loc.lng, eventId: event.id,
      status: event.status, detail: event.detail, eventTime: event.event_time
    } : null;
  };
  const recorded = rawEvents.map(resolvePoint).filter(Boolean);
  const active = rawEvents.find(e => e.status === 'active');
  const lastDone = [...rawEvents].reverse().find(e => e.status === 'done');
  const nextPending = rawEvents.find(e => e.status === 'pending');
  const currentEvent = active || lastDone;
  const current = currentEvent ? resolvePoint(currentEvent) : (origin ? {
    name: origin.name, city: origin.city, country: origin.country,
    lat: origin.lat, lng: origin.lng, status: 'origin'
  } : null);
  const next = nextPending ? resolvePoint(nextPending) : (destination ? {
    name: destination.name, city: destination.city, country: destination.country,
    lat: destination.lat, lng: destination.lng, status: 'destination'
  } : null);
  return {
    current: current ? { ...current, type: active ? 'active' : currentEvent ? 'milestone' : 'origin' } : null,
    next: next ? { ...next, type: nextPending ? 'milestone' : 'destination' } : null,
    destination: destination ? {
      name: destination.name, city: destination.city, country: destination.country,
      lat: destination.lat, lng: destination.lng, type: 'destination'
    } : null,
    recordedCount: recorded.length
  };
}

const listForAtlas = asyncHandler(async (req, res) => {
  const params = [req.user.id];
  let access = '';
  if (req.user.role === 'admin') {
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
    if (origin) points.push({ type: 'origin', name: origin.name, city: origin.city, country: origin.country, lat: origin.lat, lng: origin.lng });

    for (const e of rawEvents) {
      const loc = resolveAtlasLocation(e.location);
      if (!loc) continue;
      const previous = points[points.length - 1];
      if (previous && previous.lat === loc.lat && previous.lng === loc.lng) continue;
      points.push({
        type: e.status === 'active' ? 'active' : 'milestone',
        name: loc.name, city: loc.city, country: loc.country,
        lat: loc.lat, lng: loc.lng, eventId: e.id, status: e.status,
        detail: e.detail, eventTime: e.event_time
      });
    }

    const destination = resolveAtlasLocation(s.destination_port);
    if (destination) {
      const previous = points[points.length - 1];
      if (!previous || previous.lat !== destination.lat || previous.lng !== destination.lng) {
        points.push({ type: 'destination', name: destination.name, city: destination.city, country: destination.country, lat: destination.lat, lng: destination.lng });
      }
    }
    const journey = journeySummary(rawEvents, origin, destination);

    return {
      id: s.id, orderId: s.order_id, reference: s.reference, containerNo: s.container_no,
      carrier: s.carrier, originPort: s.origin_port, destinationPort: s.destination_port,
      vessel: { name: s.vessel_name, imo: s.vessel_imo, mmsi: s.vessel_mmsi, voyageNo: s.voyage_no, trackingProvider: s.tracking_provider },
      percentComplete: s.percent_complete, status: mapShipmentStatus(s.order_status, s.percent_complete),
      buyerName: req.user.role === 'admin' || req.user.role === 'buyer' ? s.buyer_name : null,
      supplierName: req.user.role === 'admin' || req.user.role === 'supplier' ? s.supplier_name : null,
      milestones: rawEvents.map(e => {
        const loc = resolveAtlasLocation(e.location);
        return {
          id: e.id, location: e.location, detail: e.detail, status: e.status,
          eventTime: e.event_time, sortOrder: e.sort_order,
          coordinates: loc ? { lat: loc.lat, lng: loc.lng, name: loc.name } : null
        };
      }),
      routePoints: points,
      journey
    };
  }).filter(s => s.routePoints.length >= 2);

  res.json({ ok: true, count: shipments.length, shipments });
});

const getLiveTracking = asyncHandler(async (req, res) => {
  const shipmentRes = await query(
    `SELECT s.*, o.buyer_id, o.supplier_id, o.bank_id
     FROM shipments s JOIN orders o ON o.id = s.order_id
     WHERE s.id = $1 LIMIT 1`,
    [req.params.shipmentId]
  );
  const shipment = shipmentRes.rows[0];
  if (!shipment) throw new AppError('Shipment not found', 404);

  const allowed =
    req.user.role === 'admin' ||
    (req.user.role === 'buyer' && shipment.buyer_id === req.user.id) ||
    (req.user.role === 'supplier' && shipment.supplier_id === req.user.id) ||
    (req.user.role === 'bank' && shipment.bank_id === req.user.id);
  if (!allowed) throw new AppError('Forbidden', 403, 'FORBIDDEN');

  const tracking = await getLiveVesselPosition({
    vesselName: shipment.vessel_name, imo: shipment.vessel_imo, mmsi: shipment.vessel_mmsi
  });

  res.json({
    ok: true, shipmentId: shipment.id, provider: tracking.provider,
    available: tracking.available, reason: tracking.reason || null,
    vessel: tracking.vessel || null, nextMilestone: shipment.destination_port || null
  });
});

const audit = require('../services/audit.service');

const createSchema = z.object({
  orderId: z.string().uuid(), containerNo: z.string().optional(), carrier: z.string().optional(),
  originPort: z.string().optional(), destinationPort: z.string().optional(),
  vesselName: z.string().optional(), vesselImo: z.string().optional(), vesselMmsi: z.string().optional(),
  voyageNo: z.string().optional(), trackingProvider: z.string().optional(),
});

const create = asyncHandler(async (req, res) => {
  const data = createSchema.parse(req.body);
  const orderRes = await query('SELECT id, supplier_id, status FROM orders WHERE id = $1 LIMIT 1', [data.orderId]);
  const order = orderRes.rows[0];
  if (!order) throw new AppError('Order not found', 404);
  if (req.user.role !== 'admin' && order.supplier_id !== req.user.id) {
    throw new AppError('Only the supplier assigned to this order can create its shipment', 403, 'FORBIDDEN');
  }
  if (req.user.role !== 'admin' && !['confirmed','lc_issued','shipped'].includes(order.status)) {
    throw new AppError('A shipment can only be created after the order is confirmed', 409, 'INVALID_SHIPMENT_ORDER_STATUS');
  }
  const existing = await query('SELECT id FROM shipments WHERE order_id = $1 LIMIT 1', [data.orderId]);
  if (existing.rows[0]) throw new AppError('A shipment is already linked to this order', 409, 'SHIPMENT_EXISTS');

  const { rows } = await query(
    `INSERT INTO shipments (order_id, container_no, carrier, origin_port, destination_port, vessel_name, vessel_imo, vessel_mmsi, voyage_no, tracking_provider)
     VALUES ($1,$2,$3,$4,COALESCE($5,'Tin Can Island, Lagos'),$6,$7,$8,$9,$10) RETURNING *`,
    [data.orderId, data.containerNo || null, data.carrier || null, data.originPort || null, data.destinationPort || null,
      data.vesselName || null, data.vesselImo || null, data.vesselMmsi || null, data.voyageNo || null, data.trackingProvider || null]
  );
  await audit.log(req.user.id, 'Shipment Created', `Shipment created for order ${data.orderId}`, req.ip);
  res.status(201).json({ shipment: rows[0] });
});

const vesselSchema = z.object({
  vesselName: z.string().trim().min(1).optional(),
  vesselImo: z.string().trim().min(1).optional(),
  vesselMmsi: z.string().trim().min(1).optional(),
  voyageNo: z.string().trim().min(1).optional(),
  trackingProvider: z.string().trim().min(1).optional()
}).refine(v => Object.values(v).some(Boolean), { message: 'At least one vessel/tracking field is required.' });

const updateVessel = asyncHandler(async (req, res) => {
  const data = vesselSchema.parse(req.body);
  const shipmentRes = await query(
    `SELECT s.id, o.supplier_id, o.buyer_id, o.bank_id, o.status AS order_status
       FROM shipments s JOIN orders o ON o.id = s.order_id
      WHERE s.id = $1 LIMIT 1`, [req.params.shipmentId]
  );
  const shipment = shipmentRes.rows[0];
  if (!shipment) throw new AppError('Shipment not found', 404);
  const allowed = req.user.role === 'admin' ||
    (req.user.role === 'supplier' && shipment.supplier_id === req.user.id) ||
    (req.user.role === 'bank' && shipment.bank_id === req.user.id);
  if (!allowed) throw new AppError('You are not assigned to this shipment', 403, 'FORBIDDEN');
  if (['delivered','cancelled'].includes(shipment.order_status)) {
    throw new AppError('Shipment cannot be changed after the order is closed', 409, 'ORDER_CLOSED');
  }
  const result = await query(
    `UPDATE shipments SET
       vessel_name = COALESCE($1, vessel_name), vessel_imo = COALESCE($2, vessel_imo),
       vessel_mmsi = COALESCE($3, vessel_mmsi), voyage_no = COALESCE($4, voyage_no),
       tracking_provider = COALESCE($5, tracking_provider)
     WHERE id = $6 RETURNING *`,
    [data.vesselName || null, data.vesselImo || null, data.vesselMmsi || null, data.voyageNo || null, data.trackingProvider || null, req.params.shipmentId]
  );
  await audit.log(req.user.id, 'Vessel Tracking Updated', `Vessel metadata updated for shipment ${req.params.shipmentId}`, req.ip);
  res.json({ shipment: result.rows[0] });
});
const getForOrder = asyncHandler(async (req, res) => {
  const accessRes = await query(
    'SELECT id, buyer_id, supplier_id, bank_id FROM orders WHERE id = $1 LIMIT 1',
    [req.params.orderId]
  );
  const order = accessRes.rows[0];
  if (!order) throw new AppError('Order not found', 404);
  const allowed = req.user.role === 'admin' || req.user.id === order.buyer_id ||
    req.user.id === order.supplier_id || req.user.id === order.bank_id;
  if (!allowed) throw new AppError('Forbidden', 403, 'FORBIDDEN');

  const shipmentRes = await query('SELECT * FROM shipments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1', [req.params.orderId]);
  const shipment = shipmentRes.rows[0];
  if (!shipment) throw new AppError('No shipment found for this order', 404);
  const events = await query('SELECT * FROM tracking_events WHERE shipment_id = $1 ORDER BY sort_order ASC, event_time ASC', [shipment.id]);
  const routePoints = [];
  const origin = resolveAtlasLocation(shipment.origin_port);
  if (origin) routePoints.push({type:'origin',name:origin.name,city:origin.city,country:origin.country,lat:origin.lat,lng:origin.lng});
  for (const e of events.rows) {
    const loc = resolveAtlasLocation(e.location);
    if (!loc) continue;
    const prev = routePoints[routePoints.length-1];
    if (prev && prev.lat === loc.lat && prev.lng === loc.lng) continue;
    routePoints.push({type:e.status==='active'?'active':'milestone',name:loc.name,city:loc.city,country:loc.country,lat:loc.lat,lng:loc.lng,status:e.status,detail:e.detail,eventTime:e.event_time});
  }
  const destination = resolveAtlasLocation(shipment.destination_port);
  if (destination) {
    const prev = routePoints[routePoints.length-1];
    if (!prev || prev.lat !== destination.lat || prev.lng !== destination.lng) {
      routePoints.push({type:'destination',name:destination.name,city:destination.city,country:destination.country,lat:destination.lat,lng:destination.lng});
    }
  }
  const journey = journeySummary(events.rows, origin, destination);
  res.json({ shipment, events: events.rows, routePoints, journey });
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
    const shipmentRes = await client.query(
      `SELECT s.*, o.status AS order_status, o.supplier_id, o.buyer_id, o.bank_id
         FROM shipments s JOIN orders o ON o.id = s.order_id
        WHERE s.id = $1 FOR UPDATE`,
      [req.params.shipmentId]
    );
    const shipment = shipmentRes.rows[0];
    if (!shipment) throw new AppError('Shipment not found', 404);

    const allowed = req.user.role === 'admin' ||
      (req.user.role === 'supplier' && shipment.supplier_id === req.user.id) ||
      (req.user.role === 'bank' && shipment.bank_id === req.user.id);
    if (!allowed) throw new AppError('You are not assigned to this shipment', 403, 'FORBIDDEN');
    if (['delivered','cancelled'].includes(shipment.order_status)) {
      throw new AppError('Shipment cannot be updated after the order is closed', 409, 'ORDER_CLOSED');
    }

    const existingRes = await client.query(
      'SELECT status, sort_order FROM tracking_events WHERE shipment_id=$1 ORDER BY sort_order DESC, event_time DESC',
      [req.params.shipmentId]
    );
    const existing = existingRes.rows;
    const currentActive = existing.find(e => e.status === 'active');
    const highestSort = existing.length ? Number(existing[0].sort_order || 0) : -1;

    if (data.status === 'active' && currentActive) {
      throw new AppError('This shipment already has an active milestone. Complete it before setting another milestone active.',409,'ACTIVE_MILESTONE_EXISTS');
    }
    if (data.sortOrder !== undefined && data.sortOrder <= highestSort) {
      throw new AppError('Milestone order must move forward from the latest recorded milestone.',409,'INVALID_MILESTONE_ORDER');
    }
    if (data.sortOrder === undefined) data.sortOrder = highestSort + 1;

    if (data.percentComplete !== undefined && data.percentComplete < Number(shipment.percent_complete || 0)) {
      throw new AppError('Shipment completion cannot move backwards.',409,'PERCENT_COMPLETE_REGRESSION');
    }

    // A newly recorded milestone becomes the current operational point.
    // When it is marked done, close any previous active point as well.
    if (currentActive && data.status === 'done') {
      await client.query(
        'UPDATE tracking_events SET status = $1 WHERE shipment_id = $2 AND status = $3',
        ['done', req.params.shipmentId, 'active']
      );
    }

    const evRes = await client.query(
      `INSERT INTO tracking_events (shipment_id, location, detail, status, sort_order)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.shipmentId, data.location, data.detail || null, data.status, data.sortOrder]
    );

    if (data.percentComplete !== undefined) {
      await client.query(
        'UPDATE shipments SET percent_complete = $1 WHERE id = $2',
        [data.percentComplete, req.params.shipmentId]
      );
    }

    return evRes.rows[0];
  });

  await audit.log(req.user.id, 'Tracking Updated', `${data.location} — ${data.status}`, req.ip);
  res.status(201).json({ event: result });
});

module.exports = { create, getForOrder, addEvent, listForAtlas, getLiveTracking, updateVessel };
