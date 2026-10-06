const axios = require('axios');

const PROVIDER = String(process.env.VTG_TRACKING_PROVIDER || 'none').toLowerCase();
const API_KEY = process.env.VTG_TRACKING_API_KEY || '';
const BASE_URL = process.env.VTG_TRACKING_BASE_URL || 'https://api.datalastic.com/api/v0';
const CACHE_TTL_MS = Math.max(15000, Number(process.env.VTG_TRACKING_CACHE_TTL_MS || 45000));
const cache = new Map();

function cacheKey(identifier) {
  return String(identifier?.imo || identifier?.mmsi || identifier?.vesselName || '').trim().toLowerCase();
}

function unavailable(reason) {
  return { available: false, provider: PROVIDER, status: 'unavailable', reason };
}

async function fetchDatalastic(identifier) {
  if (!API_KEY) return unavailable('VTG_TRACKING_API_KEY is not configured.');
  if (!identifier?.imo && !identifier?.mmsi) return unavailable('Shipment has no IMO or MMSI identifier.');

  const params = identifier.imo ? { imo: identifier.imo } : { mmsi: identifier.mmsi };
  const response = await axios.get(`${BASE_URL}/vessel`, {
    params,
    headers: { 'x-api-key': API_KEY },
    timeout: 10000
  });
  const d = response.data?.data;
  if (!d || !Number.isFinite(Number(d.lat)) || !Number.isFinite(Number(d.lon))) {
    return unavailable('Provider returned no current vessel position.');
  }

  const lastUpdated=d.last_position_UTC || null;
  const ageMs=lastUpdated?Math.max(0,Date.now()-Date.parse(lastUpdated)):Infinity;
  return {
    available: true,
    provider: 'datalastic',
    status: ageMs <= Math.max(60000,Number(process.env.VTG_DATA_STALE_AFTER_MS||300000)) ? 'fresh' : 'stale',
    ageMs,
    vessel: {
      name: d.name || identifier.vesselName || null,
      imo: d.imo || identifier.imo || null,
      mmsi: d.mmsi || identifier.mmsi || null,
      lat: Number(d.lat),
      lng: Number(d.lon),
      speedKnots: d.speed == null ? null : Number(d.speed),
      course: d.course == null ? null : Number(d.course),
      heading: d.heading == null ? null : Number(d.heading),
      navigationStatus: d.navigation_status || null,
      destination: d.destination || d.dest_port || null,
      destinationUnlocode: d.dest_port_unlocode || null,
      eta: d.eta_UTC || null,
      lastUpdated: d.last_position_UTC || null
    }
  };
}

async function getLiveVesselPosition(identifier) {
  const key = cacheKey(identifier);
  if (key) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.timestamp < CACHE_TTL_MS) return hit.value;
  }
  let value;
  if (PROVIDER === 'datalastic') value = await fetchDatalastic(identifier);
  else if (PROVIDER === 'none') value = unavailable('No live tracking provider is configured.');
  else value = unavailable(`Unsupported VTG_TRACKING_PROVIDER: ${PROVIDER}`);
  if (key) cache.set(key, { timestamp: Date.now(), value });
  return value;
}


module.exports = { getLiveVesselPosition };
