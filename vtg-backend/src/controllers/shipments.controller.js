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
  } else if (req.user.role === 'agent') {
    access = 'WHERE o.id IN (SELECT ir.order_id FROM inspection_requests ir WHERE ir.assigned_agent_id = $1 AND ir.order_id IS NOT NULL)';
  } else {
    throw new AppError('Unsupported role', 403, 'FORBIDDEN');
  }

  const shipmentsRes = await query(
    `SELECT s.*, o.reference, o.status AS order_status, o.buyer_id, o.supplier_id,
            o.total_amount_usd, o.currency, o.incoterm,
            bu.full_name AS buyer_name, su.full_name AS supplier_name,
            sc.status AS customs_status, sc.authority AS customs_authority,
            sc.declaration_ref AS customs_declaration_ref,
            sc.assessment_amount_usd AS customs_assessment_amount_usd,
            sc.duties_amount_usd AS customs_duties_amount_usd,
            sc.taxes_amount_usd AS customs_taxes_amount_usd,
            sc.other_charges_usd AS customs_other_charges_usd,
            sc.submitted_at AS customs_submitted_at, sc.assessed_at AS customs_assessed_at,
            sc.cleared_at AS customs_cleared_at, sc.released_at AS customs_released_at,
            sd.status AS delivery_status, sd.recipient_name AS delivery_recipient_name,
            sd.notes AS delivery_notes, sd.proof_document_id AS delivery_proof_document_id,
            sd.confirmed_at AS delivery_confirmed_at,
            ir.reference AS inspection_reference, ir.status AS inspection_status,
            ir.product_name AS inspection_product_name, ir.category AS inspection_category,
            ir.quantity AS inspection_quantity, ir.service_level AS inspection_service_level,
            ir.requested_checks AS inspection_requested_checks, ir.add_video AS inspection_add_video,
            ir.urgent AS inspection_urgent, ir.inspection_summary,
            ir.assigned_agent_id AS inspection_agent_id, ir.completed_at AS inspection_completed_at,
            ir.payment_status AS inspection_payment_status, ir.paid_at AS inspection_paid_at,
            ir.agent_payout_usd AS inspection_agent_payout_usd,
            ap.status AS agent_payout_status, ie.evidence_count AS inspection_evidence_count,
            lc.reference AS lc_reference, lc.status AS lc_status, lc.amount_usd AS lc_amount_usd,
            lc.issuing_bank_name AS lc_issuing_bank_name, lc.swift_mt700_ref AS lc_swift_mt700_ref,
            lc.swift_mt103_ref AS lc_swift_mt103_ref, lc.expiry_date AS lc_expiry_date,
            pr.id AS latest_payment_id, pr.method AS latest_payment_method, pr.amount AS latest_payment_amount,
            pr.currency AS latest_payment_currency, pr.status AS latest_payment_status,
            pr.provider_ref AS latest_payment_provider_ref, pr.created_at AS latest_payment_created_at,
            ps.payment_count, ps.active_payment_count, ps.completed_payment_count, ps.completed_payment_amount
     FROM shipments s
     JOIN orders o ON o.id = s.order_id
     JOIN users bu ON bu.id = o.buyer_id
     JOIN users su ON su.id = o.supplier_id
     LEFT JOIN shipment_customs sc ON sc.shipment_id = s.id
     LEFT JOIN shipment_delivery sd ON sd.shipment_id = s.id
     LEFT JOIN LATERAL (
       SELECT ir.*
       FROM inspection_requests ir
       WHERE ir.order_id = o.id
       ORDER BY ir.created_at DESC
       LIMIT 1
     ) ir ON true
     LEFT JOIN agent_payouts ap ON ap.inspection_id = ir.id
     LEFT JOIN LATERAL (
       SELECT l.*
       FROM letters_of_credit l
       WHERE l.order_id = o.id
       ORDER BY l.created_at DESC
       LIMIT 1
     ) lc ON true
     LEFT JOIN LATERAL (
       SELECT p.*
       FROM payment_requests p
       WHERE p.order_id = o.id
       ORDER BY p.created_at DESC
       LIMIT 1
     ) pr ON true
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS payment_count,
              COUNT(*) FILTER (WHERE p.status IN ('pending','processing'))::int AS active_payment_count,
              COUNT(*) FILTER (WHERE p.status='completed')::int AS completed_payment_count,
              COALESCE(SUM(p.amount) FILTER (WHERE p.status='completed'),0) AS completed_payment_amount
       FROM payment_requests p
       WHERE p.order_id = o.id
     ) ps ON true
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS evidence_count
       FROM inspection_evidence x
       WHERE x.inspection_id = ir.id
     ) ie ON true
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
    let liveTracking = null;
    if (s.vessel_name || s.vessel_imo || s.vessel_mmsi) {
      try {
        const tracking = await getLiveVesselPosition({
          vesselName: s.vessel_name, imo: s.vessel_imo, mmsi: s.vessel_mmsi
        });
        if (tracking.available && tracking.vessel) {
          liveTracking = {
            provider: tracking.provider || null,
            available: true,
            latitude: tracking.vessel.latitude ?? tracking.vessel.lat ?? null,
            longitude: tracking.vessel.longitude ?? tracking.vessel.lng ?? null,
            speedKnots: tracking.vessel.speedKnots ?? tracking.vessel.speed ?? null,
            course: tracking.vessel.course ?? null,
            heading: tracking.vessel.heading ?? null,
            timestamp: tracking.vessel.timestamp ?? tracking.vessel.lastUpdated ?? null,
            nextPort: tracking.vessel.nextPort || tracking.vessel.destination || destination?.name || null,
            eta: tracking.vessel.eta || tracking.vessel.estimatedArrival || null
          };
        }
      } catch (_) {
        // Atlas remains usable when the external AIS provider is unavailable.
      }
    }

    return {
      id: s.id, orderId: s.order_id, reference: s.reference, containerNo: s.container_no,
      carrier: s.carrier, originPort: s.origin_port, destinationPort: s.destination_port,
      vessel: { name: s.vessel_name, imo: s.vessel_imo, mmsi: s.vessel_mmsi, voyageNo: s.voyage_no, trackingProvider: s.tracking_provider },
      liveTracking,
      percentComplete: s.percent_complete, status: mapShipmentStatus(s.order_status, s.percent_complete),
      customs: {
        status: s.customs_status || 'not_started',
        authority: s.customs_authority || null,
        declarationRef: s.customs_declaration_ref || null,
        assessmentAmountUsd: s.customs_assessment_amount_usd ?? null,
        dutiesAmountUsd: s.customs_duties_amount_usd ?? null,
        taxesAmountUsd: s.customs_taxes_amount_usd ?? null,
        otherChargesUsd: s.customs_other_charges_usd ?? null,
        submittedAt: s.customs_submitted_at || null,
        assessedAt: s.customs_assessed_at || null,
        clearedAt: s.customs_cleared_at || null,
        releasedAt: s.customs_released_at || null
      },
      delivery: {
        status: s.delivery_status || 'pending',
        recipientName: s.delivery_recipient_name || null,
        notes: s.delivery_notes || null,
        proofDocumentId: s.delivery_proof_document_id || null,
        confirmedAt: s.delivery_confirmed_at || null,
        proofAttached: Boolean(s.delivery_proof_document_id)
      },
      inspection: s.inspection_reference ? {
        reference: s.inspection_reference,
        status: s.inspection_status || null,
        productName: s.inspection_product_name || null,
        category: s.inspection_category || null,
        quantity: s.inspection_quantity ?? null,
        serviceLevel: s.inspection_service_level || null,
        requestedChecks: s.inspection_requested_checks || null,
        addVideo: Boolean(s.inspection_add_video),
        urgent: Boolean(s.inspection_urgent),
        summary: s.inspection_summary || null,
        assignedAgent: Boolean(s.inspection_agent_id),
        completedAt: s.inspection_completed_at || null,
        paymentStatus: s.inspection_payment_status || null,
        paidAt: s.inspection_paid_at || null,
        evidenceCount: Number(s.inspection_evidence_count || 0),
        payoutStatus: s.agent_payout_status || null,
        agentPayoutUsd: ['admin','agent'].includes(req.user.role) ? (s.inspection_agent_payout_usd ?? null) : null
      } : null,
      finance: {
        orderTotalUsd: s.total_amount_usd ?? null,
        orderCurrency: s.currency || null,
        incoterm: s.incoterm || null,
        lc: s.lc_reference ? {
          reference: s.lc_reference,
          status: s.lc_status || null,
          amountUsd: s.lc_amount_usd ?? null,
          issuingBankName: s.lc_issuing_bank_name || null,
          swiftMt700Ref: s.lc_swift_mt700_ref || null,
          swiftMt103Ref: s.lc_swift_mt103_ref || null,
          expiryDate: s.lc_expiry_date || null
        } : null,
        latestPayment: s.latest_payment_id ? {
          id: s.latest_payment_id,
          method: s.latest_payment_method || null,
          amount: s.latest_payment_amount ?? null,
          currency: s.latest_payment_currency || null,
          status: s.latest_payment_status || null,
          providerRef: s.latest_payment_provider_ref || null,
          createdAt: s.latest_payment_created_at || null
        } : null,
        paymentCount: Number(s.payment_count || 0),
        activePaymentCount: Number(s.active_payment_count || 0),
        completedPaymentCount: Number(s.completed_payment_count || 0),
        completedPaymentAmount: s.completed_payment_amount ?? 0
      },
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
      journey,
      logistics: {
        order: { id: s.order_id, reference: s.reference, status: s.order_status },
        shipment: { id: s.id, containerNo: s.container_no, carrier: s.carrier, percentComplete: s.percent_complete },
        vessel: { name: s.vessel_name, imo: s.vessel_imo, mmsi: s.vessel_mmsi, voyageNo: s.voyage_no },
        ports: { origin: s.origin_port, destination: s.destination_port },
        customs: { status: s.customs_status || 'not_started', clearedAt: s.customs_cleared_at || null, releasedAt: s.customs_released_at || null },
        buyer: { id: s.buyer_id, name: req.user.role === 'admin' || req.user.role === 'buyer' ? s.buyer_name : null },
        supplier: { id: s.supplier_id, name: req.user.role === 'admin' || req.user.role === 'supplier' ? s.supplier_name : null }
      }
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


const customsStatuses = ['not_started','documents_required','under_assessment','payment_due','inspection','cleared','released','on_hold'];
const customsSchema = z.object({
  authority: z.string().trim().max(160).optional(),
  brokerName: z.string().trim().max(160).optional(),
  declarationRef: z.string().trim().max(120).optional(),
  assessmentAmountUsd: z.number().min(0).optional(),
  dutiesAmountUsd: z.number().min(0).optional(),
  taxesAmountUsd: z.number().min(0).optional(),
  otherChargesUsd: z.number().min(0).optional(),
  notes: z.string().trim().max(2000).optional(),
});
const customsStatusSchema = z.object({ status: z.enum(customsStatuses) });

async function getShipmentForCustoms(shipmentId) {
  const { rows } = await query(
    `SELECT s.id, s.order_id, s.destination_port, o.status AS order_status,
            o.buyer_id, o.supplier_id, o.bank_id
       FROM shipments s JOIN orders o ON o.id = s.order_id
      WHERE s.id = $1 LIMIT 1`, [shipmentId]
  );
  if (!rows[0]) throw new AppError('Shipment not found', 404);
  return rows[0];
}

function canOperateCustoms(shipment, user) {
  return user.role === 'admin' || shipment.supplier_id === user.id || shipment.bank_id === user.id;
}
function canViewCustoms(shipment, user) {
  return user.role === 'admin' || [shipment.buyer_id, shipment.supplier_id, shipment.bank_id].includes(user.id);
}

const getCustoms = asyncHandler(async (req, res) => {
  const shipment = await getShipmentForCustoms(req.params.shipmentId);
  if (!canViewCustoms(shipment, req.user)) throw new AppError('Forbidden', 403, 'FORBIDDEN');
  const { rows } = await query('SELECT * FROM shipment_customs WHERE shipment_id = $1 LIMIT 1', [shipment.id]);
  res.json({ customs: rows[0] || null });
});

const createCustoms = asyncHandler(async (req, res) => {
  const data = customsSchema.parse(req.body);
  const shipment = await getShipmentForCustoms(req.params.shipmentId);
  if (!canOperateCustoms(shipment, req.user)) throw new AppError('You are not assigned to this shipment', 403, 'FORBIDDEN');
  if (['delivered','cancelled'].includes(shipment.order_status)) throw new AppError('Shipment is closed', 409, 'ORDER_CLOSED');

  const { rows: existing } = await query('SELECT id FROM shipment_customs WHERE shipment_id = $1 LIMIT 1', [shipment.id]);
  if (existing[0]) throw new AppError('Customs clearance already exists for this shipment', 409, 'CUSTOMS_EXISTS');

  const { rows } = await query(
    `INSERT INTO shipment_customs
      (shipment_id, authority, broker_name, declaration_ref, assessment_amount_usd, duties_amount_usd, taxes_amount_usd, other_charges_usd, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [shipment.id, data.authority || null, data.brokerName || null, data.declarationRef || null,
      data.assessmentAmountUsd ?? null, data.dutiesAmountUsd ?? null, data.taxesAmountUsd ?? null,
      data.otherChargesUsd ?? null, data.notes || null]
  );
  await audit.log(req.user.id, 'Customs Clearance Created', `Customs workflow created for shipment ${shipment.id}`, req.ip);
  res.status(201).json({ customs: rows[0] });
});

const updateCustoms = asyncHandler(async (req, res) => {
  const shipment = await getShipmentForCustoms(req.params.shipmentId);
  if (!canOperateCustoms(shipment, req.user)) throw new AppError('You are not assigned to this shipment', 403, 'FORBIDDEN');
  if (['delivered','cancelled'].includes(shipment.order_status)) throw new AppError('Shipment is closed', 409, 'ORDER_CLOSED');

  const data = customsSchema.parse(req.body || {});
  const statusData = customsStatusSchema.parse({ status: req.body.status });
  const currentRes = await query('SELECT * FROM shipment_customs WHERE shipment_id = $1 LIMIT 1', [shipment.id]);
  const current = currentRes.rows[0];
  if (!current) throw new AppError('Create the customs clearance record first', 404, 'CUSTOMS_NOT_FOUND');

  const order = ['not_started','documents_required','under_assessment','payment_due','inspection','cleared','released','on_hold'];
  const currentIndex = order.indexOf(current.status);
  const nextIndex = order.indexOf(statusData.status);
  if (current.status !== 'on_hold' && statusData.status !== 'on_hold' && nextIndex < currentIndex) {
    throw new AppError('Customs status cannot move backwards', 409, 'INVALID_CUSTOMS_TRANSITION');
  }

  const { rows } = await query(
    `UPDATE shipment_customs SET
       status=$1, authority=COALESCE($2,authority), broker_name=COALESCE($3,broker_name),
       declaration_ref=COALESCE($4,declaration_ref), assessment_amount_usd=COALESCE($5,assessment_amount_usd),
       duties_amount_usd=COALESCE($6,duties_amount_usd), taxes_amount_usd=COALESCE($7,taxes_amount_usd),
       other_charges_usd=COALESCE($8,other_charges_usd), notes=COALESCE($9,notes),
       submitted_at=CASE WHEN $1 IN ('documents_required','under_assessment') AND submitted_at IS NULL THEN NOW() ELSE submitted_at END,
       assessed_at=CASE WHEN $1 IN ('payment_due','inspection','cleared','released') AND assessed_at IS NULL THEN NOW() ELSE assessed_at END,
       cleared_at=CASE WHEN $1 IN ('cleared','released') THEN COALESCE(cleared_at,NOW()) ELSE cleared_at END,
       released_at=CASE WHEN $1='released' THEN COALESCE(released_at,NOW()) ELSE released_at END,
       updated_at=NOW()
     WHERE shipment_id=$10 RETURNING *`,
    [statusData.status, data.authority || null, data.brokerName || null, data.declarationRef || null,
      data.assessmentAmountUsd ?? null, data.dutiesAmountUsd ?? null, data.taxesAmountUsd ?? null,
      data.otherChargesUsd ?? null, data.notes || null, shipment.id]
  );

  if (['cleared','released'].includes(statusData.status) && !['customs','delivered'].includes(shipment.order_status)) {
    await query('UPDATE orders SET status=$1, updated_at=NOW() WHERE id=$2', ['customs', shipment.order_id]);
  }
  await audit.log(req.user.id, 'Customs Status Updated', `Shipment ${shipment.id} customs -> ${statusData.status}`, req.ip);
  res.json({ customs: rows[0] });
});

module.exports = { create, getForOrder, addEvent, listForAtlas, getLiveTracking, updateVessel, getCustoms, createCustoms, updateCustoms, getDelivery, updateDelivery };
