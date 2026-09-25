const axios = require('axios');

const PROVIDER = String(process.env.VTG_TRACKING_PROVIDER || 'none').toLowerCase();
const API_KEY = process.env.VTG_TRACKING_API_KEY || '';
const BASE_URL = process.env.VTG_TRACKING_BASE_URL || 'https://api.datalastic.com/api/v0';

function unavailable(reason) {
  return { available: false, provider: PROVIDER, reason };
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

  return {
    available: true,
    provider: 'datalastic',
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
  if (PROVIDER === 'datalastic') return fetchDatalastic(identifier);
  if (PROVIDER === 'none') return unavailable('No live tracking provider is configured.');
  return unavailable(`Unsupported VTG_TRACKING_PROVIDER: ${PROVIDER}`);
}

module.exports = { getLiveVesselPosition };
