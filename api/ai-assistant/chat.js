const SYSTEM_PROMPT = [
  'You are VTG AI Trade Desk, a practical assistant for the Africa-China-South Korea trade corridor.',
  'Help users structure RFQs, normalize supplier quotes, plan inspections, prepare document checklists, understand Incoterms, organise shipment milestones and identify trade risks.',
  'Be clear, concise, professional and action-oriented. Ask focused follow-up questions when material details are missing.',
  'Never invent prices, suppliers, official requirements, duties, shipping events, vessel positions, document verification or market data.',
  'Clearly distinguish user-provided claims, uploaded evidence, independently verified facts, estimates and items that require confirmation.',
  'For customs, legal, banking, tax, sanctions, restricted goods and regulatory decisions, explain general considerations and direct users to licensed professionals or official sources.',
  'Do not request passwords, full payment-card details, private keys, or unnecessary sensitive personal information.',
  'Role context should adapt explanations for buyer/importer, supplier/exporter, bank/finance partner, inspection/logistics agent, or VTG operations.',
  'When useful, format responses with short headings and practical bullet points. If comparing quotes, never fill missing fields with guessed values.'
].join(' ');

const buckets = globalThis.__vtgAiRateBuckets || (globalThis.__vtgAiRateBuckets = new Map());
function allowed(ip) {
  const now = Date.now();
  const current = buckets.get(ip);
  if (!current || now - current.start > 15 * 60 * 1000) {
    buckets.set(ip, { start: now, count: 1 });
    if (buckets.size > 4000) for (const [key, value] of buckets) if (now - value.start > 15 * 60 * 1000) buckets.delete(key);
    return true;
  }
  if (current.count >= 20) return false;
  current.count += 1;
  return true;
}
function safeRole(value) {
  const allowedRoles = new Set(['buyer', 'supplier', 'bank', 'agent', 'admin']);
  return allowedRoles.has(String(value || '').toLowerCase()) ? String(value).toLowerCase() : 'buyer';
}
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST to send an assistant message.' } });
  }
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (!allowed(ip)) return res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many VTG AI requests. Please wait a few minutes and try again.' } });
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  const role = safeRole(req.body?.role);
  if (!message) return res.status(400).json({ error: { code: 'MESSAGE_REQUIRED', message: 'Please enter a message.' } });
  if (message.length > 6000) return res.status(413).json({ error: { code: 'MESSAGE_TOO_LONG', message: 'Please keep each message under 6,000 characters.' } });
  const apiKey = process.env.OPENAI_API_KEY || process.env.VTG_AI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: { code: 'AI_NOT_CONFIGURED', message: 'VTG AI is built, but the server-side AI key has not been configured yet.' } });
  const base = (process.env.VTG_AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const model = process.env.VTG_AI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  let upstream;
  try {
    upstream = await fetch(base + '/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, temperature: 0.3, max_tokens: 900, messages: [
        { role: 'system', content: SYSTEM_PROMPT + '\nCurrent user role: ' + role + '.' },
        { role: 'user', content: message }
      ] })
    });
  } catch (err) {
    if (err.name === 'AbortError') return res.status(504).json({ error: { code: 'AI_TIMEOUT', message: 'The assistant took too long to respond. Please try again.' } });
    console.error('VTG AI connection error:', err.name || 'connection_error');
    return res.status(502).json({ error: { code: 'AI_CONNECTION_ERROR', message: 'The assistant provider could not be reached. Please try again shortly.' } });
  } finally {
    clearTimeout(timeout);
  }
  const payload = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    console.error('VTG AI provider error:', upstream.status, payload?.error?.type || payload?.error?.code || 'provider_error');
    return res.status(502).json({ error: { code: 'AI_PROVIDER_ERROR', message: 'The assistant provider could not complete this request. Please try again shortly.' } });
  }
  const reply = payload?.choices?.[0]?.message?.content;
  if (typeof reply !== 'string' || !reply.trim()) return res.status(502).json({ error: { code: 'AI_EMPTY_RESPONSE', message: 'The assistant returned an empty response. Please try again.' } });
  return res.status(200).json({ reply: reply.trim(), role, model, mode: 'live' });
};
