const express = require('express');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many VTG AI requests. Please wait a few minutes and try again.' } }
});

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

function safeRole(value) {
  const allowed = new Set(['buyer', 'supplier', 'bank', 'agent', 'admin']);
  return allowed.has(String(value || '').toLowerCase()) ? String(value).toLowerCase() : 'buyer';
}

router.get('/status', (req, res) => {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasCompatible = Boolean(process.env.OPENAI_API_KEY || process.env.VTG_AI_API_KEY);
  const configured = hasGemini || hasCompatible;
  res.set('Cache-Control', 'no-store');
  res.json({
    service: 'vtg-ai-assistant',
    configured,
    provider: hasGemini ? 'gemini' : hasCompatible ? (process.env.VTG_AI_BASE_URL ? 'compatible-api' : 'openai-compatible') : null
  });
});

router.post('/chat', limiter, async (req, res, next) => {
  try {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const role = safeRole(req.body?.role);
    if (!message) return res.status(400).json({ error: { code: 'MESSAGE_REQUIRED', message: 'Please enter a message.' } });
    if (message.length > 6000) return res.status(413).json({ error: { code: 'MESSAGE_TOO_LONG', message: 'Please keep each message under 6,000 characters.' } });

    const geminiKey = process.env.GEMINI_API_KEY;
    const compatibleKey = process.env.OPENAI_API_KEY || process.env.VTG_AI_API_KEY;
    if (!geminiKey && !compatibleKey) {
      return res.status(503).json({ error: { code: 'AI_NOT_CONFIGURED', message: 'VTG AI is not configured on the server yet. Please try again later.' } });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    let upstream;
    let provider = geminiKey ? 'gemini' : 'compatible';
    try {
      if (geminiKey) {
        const model = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
        const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(geminiKey);
        upstream = await fetch(url, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT + '\\nCurrent user role: ' + role + '.' }] },
            contents: [{ role: 'user', parts: [{ text: message }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 900 }
          })
        });
      } else {
        const base = (process.env.VTG_AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
        const model = process.env.VTG_AI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
        upstream = await fetch(base + '/chat/completions', {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Authorization': 'Bearer ' + compatibleKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            temperature: 0.3,
            max_tokens: 900,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT + '\\nCurrent user role: ' + role + '.' },
              { role: 'user', content: message }
            ]
          })
        });
      }
    } finally {
      clearTimeout(timeout);
    }

    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      // Never log provider response bodies or request URLs: they may contain sensitive data.
      console.error('VTG AI provider error:', upstream.status, provider);
      return res.status(502).json({ error: { code: 'AI_PROVIDER_ERROR', message: 'The assistant provider could not complete this request. Please check the server AI configuration or try again shortly.' } });
    }

    const reply = provider === 'gemini'
      ? (payload?.candidates?.[0]?.content?.parts || []).map(part => typeof part.text === 'string' ? part.text : '').join('').trim()
      : (payload?.choices?.[0]?.message?.content || '').trim();

    if (typeof reply !== 'string' || !reply.trim()) {
      return res.status(502).json({ error: { code: 'AI_EMPTY_RESPONSE', message: 'The assistant returned an empty response. Please try again.' } });
    }
    res.set('Cache-Control', 'no-store');
    return res.json({ reply: reply.trim(), role, model: provider === 'gemini' ? (process.env.GEMINI_MODEL || 'gemini-2.5-flash') : (process.env.VTG_AI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini'), provider, mode: 'live' });
  } catch (err) {
    if (err.name === 'AbortError') return res.status(504).json({ error: { code: 'AI_TIMEOUT', message: 'The assistant took too long to respond. Please try again.' } });
    return next(err);
  }
});
module.exports = router;
