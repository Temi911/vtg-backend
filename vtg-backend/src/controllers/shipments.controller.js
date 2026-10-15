const { z } = require('zod');
const { query, withTransaction } = require('../config/db');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');
const { locations: atlasLocations } = require('../../../api/atlas-locations');
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
   ¶»§q«^