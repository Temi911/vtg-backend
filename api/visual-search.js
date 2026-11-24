// Marketplace "search by product photo". The browser sends one compressed JPEG; a vision model returns a
// generic product name and search keywords only. No account data, no database access, no tools.
const buckets = globalThis.__vtgVisualBuckets || (globalThis.__vtgVisualBuckets = new Map());
function allowed(ip) {
  const now = Date.now(), windowMs = 15 * 60 * 1000, cur = buckets.get(ip);
  if (!cur || now - cur.start > windowMs) { buckets.set(ip, { start: now, count: 1 }); return true; }
  if (cur.count >= 12) return false;
  cur.count += 1; return true;
}
function providers(env) {
  const trim = (v) => String(v).replace(/\/+$/, '');
  return [
    { name: 'gemini', key: env.GEMINI_API_KEY_PUBLIC_SITE || env.GEMINI_API_KEY || env.VTG_AI_API_KEY, base: trim(env.VTG_AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai'), model: env.VTG_VISION_MODEL || 'gemini-2.5-flash' },
    { name: 'openrouter', key: env.OPENROUTER_API_KEY_PUBLIC_SITE || env.OPENROUTER_API_KEY, base: 'https://openrouter.ai/api/v1', model: env.OPENROUTER_VISION_MODEL || 'google/gemini-2.0-flash-001' }
  ].filter((p) => Boolean(p.key));
}
const PROMPT = 'Identify commercial products from photos for B2B catalogue search. Return only valid JSON with keys product (short generic product name), category (short category), keywords (array of 3 to 8 short search terms), brand (string or empty), model (string or empty). Do not guess brand or model unless clearly visible. Do not claim authenticity, quality, certification or supplier. If unclear, use a cautious generic description.';
function parse(text) {
  const m = String(text || '').match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const o = JSON.parse(m[0]);
    const s = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
    const keywords = Array.isArray(o.keywords) ? o.keywords.map((k) => s(k, 40)).filter(Boolean).slice(0, 8) : [];
    const out = { product: s(o.product, 80), category: s(o.category, 60), keywords, brand: s(o.brand, 60), model: s(o.model, 60) };
    return out.product || out.category || keywords.length ? out : null;
  } catch (_) { return null; }
}
async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' } }); }
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (!allowed(ip)) return res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many photo searches. Please wait a few minutes and try again.' } });
  const image = typeof req.body?.image === 'string' ? req.body.image : '';
  if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image) || image.length > 1900000) {
    return res.status(400).json({ error: { code: 'INVALID_IMAGE', message: 'Please select a valid product photo.' } });
  }
  const list = providers(process.env);
  if (!list.length) return res.status(503).json({ error: { code: 'VISUAL_SEARCH_NOT_CONFIGURED', message: 'Photo search is not available right now. Please type what you are looking for.' } });
  for (const p of list) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
      const headers = { Authorization: 'Bearer ' + p.key, 'Content-Type': 'application/json' };
      if (p.name === 'openrouter') { headers['HTTP-Referer'] = 'https://vintageafricatrade.com'; headers['X-Title'] = 'VTG'; }
      const up = await fetch(p.base + '/chat/completions', { method: 'POST', signal: controller.signal, headers, body: JSON.stringify({ model: p.model, temperature: 0.1, max_tokens: 400, messages: [{ role: 'system', content: PROMPT }, { role: 'user', content: [{ type: 'text', text: 'Identify this product for catalogue search. Focus on generic type and visible model or brand text if legible.' }, { type: 'image_url', image_url: { url: image } }] }] }) });
      if (!up.ok) { console.warn('VTG visual search provider error', p.name, up.status); continue; }
      const payload = await up.json().catch(() => ({}));
      const found = parse(payload?.choices?.[0]?.message?.content);
      if (found) return res.status(200).json(found);
    } catch (err) {
      console.warn('VTG visual search provider unavailable', p.name, err && err.name);
    } finally { clearTimeout(timer); }
  }
  return res.status(502).json({ error: { code: 'VISUAL_SEARCH_UNAVAILABLE', message: 'Could not identify this product right now. Try a clearer photo or type your search.' } });
}
module.exports = handler;
module.exports.__test = { parse, providers };
