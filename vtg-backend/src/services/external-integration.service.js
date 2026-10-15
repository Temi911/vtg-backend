'use strict';

const cache = new Map();
const providerHistory = new Map();
const TTL = Math.max(5000, Number(process.env.VTG_INTEGRATION_CACHE_TTL_MS || 30000));
const STALE_AFTER_MS = Math.max(60000, Number(process.env.VTG_DATA_STALE_AFTER_MS || 300000));
const REQUEST_TIMEOUT_MS = Math.min(15000, Math.max(1000, Number(process.env.VTG_INTEGRATION_TIMEOUT_MS || 8000)));

function sourceFreshness(timestamp) {
  if (!timestamp) return { freshness: 'unknown', ageMs: null };
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return { freshness: 'unknown', ageMs: null };
  const ageMs = Math.max(0, Date.now() - parsed);
  return { freshness: ageMs <= STALE_AFTER_MS ? 'fresh' : 'stale', ageMs };
}

function providersConfigured() {
  return {
    vessel: { configured: Boolean(process.env.VTG_TRACKING_API_KEY && String(process.env.VTG_TRACKING_PROVIDER || '').toLowerCase() === 'datalastic'), provider: String(process.env.VTG_TRACKING_PROVIDER || 'none'), health: 'not_checked' },
    fx: { configured: Boolean(process.env.VTG_FX_BASE_URL), provider: String(process.env.VTG_FX_PROVIDER || 'none'), health: 'not_checked' },
    news: { configured: Boolean(process.env.VTG_NEWS_BASE_URL), provider: String(process.env.VTG_NEWS_PROVIDER || 'none'), health: 'not_checked' }
  };
}

function get(key) {
  const item = cache.get(key);
  return item && Date.now() - item.at < TTL ? item.value : null;
}
function put(key, value) {
  cache.set(key, { at: Date.now(), value });
  return value;
}
function recordSuccess(provider, timestamp) {
  providerHistory.set(provider, { lastSuccessAt: timestamp, lastErrorAt: null });
}
function recordFailure(provider) {
  const prior = providerHistory.get(provider) || {};
  providerHistory.set(provider, { ...prior, lastErrorAt: new Date().toISOString() });
}

async function requestJson(endpoint, params) {
  const url = new URL(endpoint);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  if (!response.ok) throw new Error('External provider returned HTTP ' + response.status);
  const type = String(response.headers.get('content-type') || '').toLowerCase();
  if (!type.includes('application/json') && !type.includes('+json')) throw new Error('External provider did not return JSON');
  return response.json();
}

function normalizeSymbols(symbols) {
  return [...new Set(symbols.map(x => String(x).trim().toUpperCase()).filter(x => /^[A-Z]{3}$/.test(x)))].slice(0, 20);
}

async function fxRates(base = 'USD', symbols = ['NGN', 'CNY', 'KRW']) {
  const b = String(base || 'USD').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(b)) return { available: false, status: 'invalid_request', provider: 'none', reason: 'Base currency must be a three-letter currency code.' };
  const syms = normalizeSymbols(Array.isArray(symbols) ? symbols : []);
  if (!syms.length) return { available: false, status: 'invalid_request', provider: 'none', reason: 'At least one valid three-letter target currency is required.' };
  const provider = String(process.env.VTG_FX_PROVIDER || 'external');
  const endpoint = process.env.VTG_FX_BASE_URL;
  if (!endpoint) return { available: false, status: 'unavailable', provider: 'none', reason: 'No VTG_FX_BASE_URL configured.' };
  let parsed;
  try { parsed = new URL(endpoint); } catch (_) { return { available: false, status: 'misconfigured', provider, reason: 'FX provider endpoint is not a valid URL.' }; }
  if (!['https:', 'http:'].includes(parsed.protocol)) return { available: false, status: 'misconfigured', provider, reason: 'FX provider endpoint must use HTTP or HTTPS.' };
  const key = 'fx:' + b + ':' + syms.join(',');
  const hit = get(key);
  if (hit) return hit;
  try {
    const data = await requestJson(parsed.toString(), { base: b, symbols: syms.join(',') });
    if (!data || typeof data !== 'object' || !data.rates || typeof data.rates !== 'object' || Array.isArray(data.rates)) throw new Error('Malformed FX response');
    const rates = {};
    for (const symbol of syms) {
      if (data.rates[symbol] == null) continue;
      const rate = Number(data.rates[symbol]);
      if (!Number.isFinite(rate) || rate <= 0) throw new Error('Invalid FX rate');
      rates[symbol] = rate;
    }
    if (!Object.keys(rates).length) throw new Error('FX response contained no requested rates');
    const retrievedAt = new Date().toISOString();
    const sourceTimestamp = data.timestamp || data.date || data.updated_at || null;
    const freshness = sourceFreshness(sourceTimestamp);
    recordSuccess('fx', retrievedAt);
    return put(key, { available: true, status: 'available', provider, base: b, rates, retrievedAt, sourceTimestamp, ...freshness });
  } catch (_) {
    recordFailure('fx');
    return { available: false, status: 'error', provider, reason: 'FX provider request failed or returned invalid data.' };
  }
}

async function news() {
  const endpoint = process.env.VTG_NEWS_BASE_URL;
  const provider = String(process.env.VTG_NEWS_PROVIDER || 'external');
  if (!endpoint) return { available: false, status: 'unavailable', provider: 'none', reason: 'No VTG_NEWS_BASE_URL configured.' };
  let parsed;
  try { parsed = new URL(endpoint); } catch (_) { return { available: false, status: 'misconfigured', provider, reason: 'News provider endpoint is not a valid URL.' }; }
  if (!['https:', 'http:'].includes(parsed.protocol)) return { available: false, status: 'misconfigured', provider, reason: 'News provider endpoint must use HTTP or HTTPS.' };
  const hit = get('news');
  if (hit) return hit;
  try {
    const data = await requestJson(parsed.toString(), { q: 'Africa China trade shipping logistics ports customs', limit: 20 });
    const items = Array.isArray(data?.articles) ? data.articles : Array.isArray(data) ? data : null;
    if (!items || items.some(item => !item || typeof item !== 'object' || Array.isArray(item))) throw new Error('Malformed news response');
    const retrievedAt = new Date().toISOString();
    const sourceTimestamp = data?.timestamp || data?.updated_at || null;
    const freshness = sourceFreshness(sourceTimestamp);
    recordSuccess('news', retrievedAt);
    return put('news', { available: true, status: 'available', provider, items: items.slice(0, 50), retrievedAt, sourceTimestamp, ...freshness });
  } catch (_) {
    recordFailure('news');
    return { available: false, status: 'error', provider, reason: 'News provider request failed or returned invalid data.' };
  }
}

async function status() {
  const rows = providersConfigured();
  for (const [key, row] of Object.entries(rows)) {
    const history = providerHistory.get(key) || {};
    rows[key] = { ...row, lastSuccessAt: history.lastSuccessAt || null, lastErrorAt: history.lastErrorAt || null };
  }
  return { generatedAt: new Date().toISOString(), staleAfterMs: STALE_AFTER_MS, providers: rows };
}

module.exports = { fxRates, news, status };
