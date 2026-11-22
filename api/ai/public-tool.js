// Anonymous visitor tools. Limited on purpose: a few free uses per visitor, then an invitation to open an account.
const { TOOLS } = require('./_public-tools.js');
const LIMIT = 6, WINDOW_MS = 15 * 60 * 1000;
const uses = globalThis.__vtgPublicToolUses || (globalThis.__vtgPublicToolUses = new Map());
const CTA = { text: 'Create a free VTG account to save estimates, compare supplier quotes and let VTG AI work with your own orders.', href: '/signup.html', label: 'Create free account' };
function take(ip) {
  const now = Date.now(), cur = uses.get(ip);
  if (!cur || now - cur.start > WINDOW_MS) { uses.set(ip, { start: now, count: 1 }); if (uses.size > 4000) for (const [k, v] of uses) if (now - v.start > WINDOW_MS) uses.delete(k); return LIMIT - 1; }
  if (cur.count >= LIMIT) return -1;
  cur.count += 1; return LIMIT - cur.count;
}
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' } }); }
  const tool = typeof req.body?.tool === 'string' ? req.body.tool : '';
  const fn = Object.prototype.hasOwnProperty.call(TOOLS, tool) ? TOOLS[tool] : null;
  if (!fn) return res.status(400).json({ error: { code: 'UNKNOWN_TOOL', message: 'That tool is not available.' } });
  const args = req.body?.args && typeof req.body.args === 'object' && !Array.isArray(req.body.args) ? req.body.args : {};
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const left = take(ip);
  if (left < 0) return res.status(429).json({ error: { code: 'FREE_LIMIT_REACHED', message: 'You have used your free tries for now.' }, cta: { ...CTA, text: 'You have used your free tries. ' + CTA.text } });
  const result = fn(args);
  return res.status(200).json({ tool, result, uses_left: left, cta: CTA });
};
module.exports.__test = { LIMIT, CTA, uses };
