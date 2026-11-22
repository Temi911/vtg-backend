// Public VTG AI (site-wide chat widget). General knowledge only:
//  - answers questions about VTG and about international trade;
//  - has NO database access, NO user session and NO tools, so it cannot read or change anyone's data;
//  - personal-account requests are declined before any model is called and the user is pointed to the
//    signed-in assistant in their dashboard, which is the only assistant that works with account data.
const SYSTEM_PROMPT = [
  'You are VTG AI, the public assistant on the website of VTG (Vintage Trade Global), a trade finance and marketplace platform connecting African businesses with suppliers in China and South Korea.',
  'You answer two kinds of questions only: (1) general questions about VTG: what it is, who it serves (buyers/importers, suppliers/exporters, banks and finance partners, inspection and logistics agents), how sign-up and verification work in general terms, and the public areas of the site such as the marketplace, Trade Atlas, Market Intelligence and the partnership pages; (2) general international trade knowledge: sourcing, RFQs, quotations, Incoterms, shipping and freight, customs concepts, trade documents, letters of credit, inspections, payment risk, forex concepts and the Africa-China-South Korea corridor.',
  'You are a public, anonymous assistant. You have no access to any VTG account, order, quotation, shipment, letter of credit, document, balance, verification status or message, and you must never claim to. Never give, guess or confirm information about any specific person, company account or transaction on VTG. If asked, say you cannot see account information and that signed-in users can ask the VTG AI inside their dashboard, which works with their own records.',
  'You cannot perform tasks for anyone: you cannot create, submit, change or cancel anything. Explain how a task is done in general terms instead, and point signed-in users to their dashboard.',
  'Stay on topic. For unrelated requests (homework, coding, entertainment, personal advice, politics and so on) say briefly that you only help with VTG and international trade.',
  'Never invent VTG fees, prices, partners, licences, statistics, features or availability. If you do not know a VTG-specific fact, say so and suggest the Contact page. Never invent duties, tariffs, exchange rates, vessel positions or regulatory requirements; explain general principles and name the official source to check.',
  'For customs, legal, tax, banking, sanctions and restricted-goods decisions give general considerations and direct people to licensed professionals or official authorities.',
  'Never ask for passwords, one-time codes, card numbers, private keys or identity numbers. Tell users never to share them in chat.',
  'Be clear, concise and practical. Use short headings or bullets only when they help.'
].join(' ');

const PERSONAL_PATTERNS = [
  /\b(my|our)\s+(order|orders|quote|quotes|quotation|quotations|shipment|shipments|account|balance|wallet|documents?|lc|letter of credit|verification|kyc|invoice|payment|rfq|request|inspection)s?\b/i,
  /\b(status|details?|information|info|history)\s+of\s+(order|quote|quotation|shipment|account|company|supplier|buyer|user)\s+[#\w-]{3,}/i,
  /\b(tell|show|give|find|look\s*up|get)\b.{0,40}\b(email|phone|number|address|password|account|balance|kyc|bvn|nin)\b.{0,40}\b(of|for)\b.{0,30}\b(user|buyer|supplier|company|customer|person|him|her|them)\b/i,
  /\b(who|which)\s+(users?|buyers?|suppliers?|companies)\s+(has|have|bought|ordered|quoted|registered|signed)/i
];
function isPersonalRequest(text) {
  const t = String(text || '');
  return PERSONAL_PATTERNS.some((re) => re.test(t));
}
const PERSONAL_REPLY = 'I can only help with general questions about VTG and international trade, so I cannot see or discuss any account, order, quotation, shipment or other personal or company records. If you have a VTG account, sign in and use the VTG AI in your dashboard: it works with your own records and can prepare tasks for you to confirm. I can also explain how any part of the process works in general. What would you like to know?';

function cleanHistory(history) {
  if (!Array.isArray(history)) return [];
  const out = [];
  for (const item of history.slice(-8)) {
    if (!item || typeof item !== 'object') continue;
    const role = item.role === 'user' ? 'user' : item.role === 'assistant' ? 'assistant' : null;
    const content = typeof item.content === 'string' ? item.content.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ').trim().slice(0, 1500) : '';
    if (role && content) out.push({ role, content });
  }
  return out;
}

const buckets = globalThis.__vtgPublicAiBuckets || (globalThis.__vtgPublicAiBuckets = new Map());
function allowed(ip) {
  const now = Date.now(), windowMs = 15 * 60 * 1000;
  const cur = buckets.get(ip);
  if (!cur || now - cur.start > windowMs) {
    buckets.set(ip, { start: now, count: 1 });
    if (buckets.size > 4000) for (const [k, v] of buckets) if (now - v.start > windowMs) buckets.delete(k);
    return true;
  }
  if (cur.count >= 30) return false;
  cur.count += 1;
  return true;
}

function providers(env) {
  const trim = (v) => String(v).replace(/\/+$/, '');
  return [
    { name: 'gemini', key: env.GEMINI_API_KEY || env.VTG_AI_API_KEY, base: trim(env.VTG_AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai'), model: env.VTG_AI_MODEL || 'gemini-2.5-flash' },
    { name: 'groq', key: env.GROQ_API_KEY, base: 'https://api.groq.com/openai/v1', model: env.GROQ_MODEL || 'openai/gpt-oss-120b' },
    { name: 'openrouter', key: env.OPENROUTER_API_KEY, base: 'https://openrouter.ai/api/v1', model: env.OPENROUTER_MODEL || 'openrouter/free' }
  ].filter((p) => Boolean(p.key));
}

async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST to send a message.' } });
  }
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (!allowed(ip)) return res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many messages. Please wait a few minutes and try again.' } });
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) return res.status(400).json({ error: { code: 'MESSAGE_REQUIRED', message: 'Please enter a message.' } });
  if (message.length > 2000) return res.status(413).json({ error: { code: 'MESSAGE_TOO_LONG', message: 'Please keep each message under 2,000 characters.' } });
  // The request body can carry a role, country or auth header; none of them is used. This endpoint is anonymous by design.
  if (isPersonalRequest(message)) return res.status(200).json({ reply: PERSONAL_REPLY, mode: 'public', scope: 'general' });
  const list = providers(process.env);
  if (!list.length) return res.status(503).json({ error: { code: 'AI_NOT_CONFIGURED', message: 'VTG AI is not available right now. Please try again later or use the Contact page.' } });
  const convo = [{ role: 'system', content: SYSTEM_PROMPT }, ...cleanHistory(req.body?.history), { role: 'user', content: message }];
  for (const p of list) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const headers = { Authorization: 'Bearer ' + p.key, 'Content-Type': 'application/json' };
      if (p.name === 'openrouter') { headers['HTTP-Referer'] = 'https://vintageafricatrade.com'; headers['X-Title'] = 'VTG'; }
      const up = await fetch(p.base + '/chat/completions', { method: 'POST', signal: controller.signal, headers, body: JSON.stringify({ model: p.model, temperature: 0.3, max_tokens: 700, messages: convo }) });
      if (!up.ok) { console.warn('VTG public AI provider error', p.name, up.status); continue; }
      const payload = await up.json().catch(() => ({}));
      const reply = payload?.choices?.[0]?.message?.content;
      if (typeof reply === 'string' && reply.trim()) return res.status(200).json({ reply: reply.trim(), mode: 'public', scope: 'general' });
    } catch (err) {
      console.warn('VTG public AI provider unavailable', p.name, err && err.name);
    } finally {
      clearTimeout(timer);
    }
  }
  return res.status(200).json({ reply: 'VTG AI is temporarily unable to answer. Please try again shortly, or use the Contact page.', mode: 'fallback', error: { code: 'AI_PROVIDER_UNAVAILABLE' } });
}
module.exports = handler;
module.exports.__test = { SYSTEM_PROMPT, isPersonalRequest, cleanHistory, providers, PERSONAL_REPLY };
