const { z } = require('zod');
const { asyncHandler } = require('../utils/asyncHandler');
const { query } = require('../config/db');
const ai = require('../services/ai.service');
const liveAi = require('../services/live-ai.service');
const openrouterAi = require('../services/openrouter-ai.service');
const audit = require('../services/audit.service');

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .max(20)
    .optional()
    .default([]),
  country: z.string().optional(),
  role: z.string().optional(),
});

const chat = asyncHandler(async (req, res) => {
  const { message, history, country, role } = chatSchema.parse(req.body);
  const userRes = await query('SELECT full_name FROM users WHERE id = $1', [req.user.id]);
  const fullName = userRes.rows[0]?.full_name || req.user.email;
  const ctx = { userId: req.user.id, role: req.user.role, fullName };
  const fullHistory = [...history, { role: 'user', content: message }];
  const result = await ai.chat(ctx, fullHistory, { country, role: role || req.user.role });
  await audit.log(req.user.id, 'AI Assistant Query', message.slice(0, 140), req.ip);
  res.json({ reply: result.reply, toolsUsed: result.toolsUsed });
});


const status = asyncHandler(async (req, res) => {
  const primary = liveAi.providerStatus();
  const fallbackEnabled = openrouterAi.enabled();
  const ready = primary.enabled || fallbackEnabled;
  res.json({
    status: ready ? 'ready' : 'unavailable',
    provider: primary.enabled ? primary.provider : (fallbackEnabled ? 'openrouter-fallback' : primary.provider),
    primaryEnabled: primary.enabled,
    fallbackEnabled,
    liveSearch: Boolean(primary.enabled && primary.liveSearch),
    message: !ready
      ? 'VTG AI is awaiting provider configuration.'
      : primary.enabled
        ? 'VTG AI is ready with live web search.'
        : 'VTG AI is ready in fallback mode; live web search is unavailable.'
  });
});

const tradeIntelligence = asyncHandler(async (req, res) => {
  const { message, history, country, role } = chatSchema.parse(req.body);
  const userRes = await query(
    `SELECT id, role, country, full_name, business_name, preferred_currency
     FROM users WHERE id = $1`,
    [req.user.id]
  );
  const user = userRes.rows[0] || {};
  const account = {
    role: user.role || req.user.role,
    country: user.country || country || 'Nigeria',
    name: user.full_name || null,
    businessName: user.business_name || null,
    currency: user.preferred_currency || null,
  };

  const shipmentRes = await query(
    `SELECT s.id, s.reference, s.status, s.percent_complete, s.origin_port, s.destination_port,
            s.carrier, s.vessel_name, s.container_no, s.order_id,
            o.reference AS order_reference, o.status AS order_status, o.total_amount_usd,
            o.currency, o.incoterm
     FROM shipments s
     JOIN orders o ON o.id = s.order_id
     WHERE (o.buyer_id = $1 OR o.supplier_id = $1 OR o.bank_id = $1)
     ORDER BY s.created_at DESC LIMIT 10`,
    [req.user.id]
  );

  const context = {
    account,
    activeTradeCount: shipmentRes.rows.length,
    trades: shipmentRes.rows.map(s => ({
      reference: s.reference,
      orderReference: s.order_reference,
      status: s.status,
      progress: s.percent_complete,
      origin: s.origin_port,
      destination: s.destination_port,
      carrier: s.carrier,
      vessel: s.vessel_name,
      container: s.container_no,
      orderStatus: s.order_status,
      valueUsd: s.total_amount_usd,
      currency: s.currency,
      incoterm: s.incoterm,
    })),
  };

  if (!liveAi.enabled()) {
    return res.status(503).json({
      error: 'VTG Trade Intelligence is not connected to its live AI provider yet.',
      code: 'AI_PROVIDER_UNAVAILABLE',
    });
  }

  try {
    const result = await liveAi.tradeIntelligence({
      question: message,
      history,
      country: country || account.country,
      role: role || account.role,
      context,
    });
    await audit.log(req.user.id, 'VTG Trade Intelligence Query', message.slice(0, 140), req.ip);
    return res.json({
      reply: result.reply,
      toolsUsed: result.toolsUsed || [],
      provider: result.provider || 'gemini',
      citations: result.citations || [],
      interactionId: result.interactionId || null,
    });
  } catch (err) {
    console.error('[ai] trade intelligence failed:', err.message);
    return res.status(503).json({
      error: 'VTG Trade Intelligence is temporarily unavailable. Please try again shortly.',
      code: 'AI_PROVIDER_UNAVAILABLE',
    });
  }
});

const publicChat = asyncHandler(async (req, res) => {
  const { message, history, country, role } = chatSchema.parse(req.body);
  let lastError = null;

  if (liveAi.enabled()) {
    try {
      const result = await liveAi.publicChat({ message, history, country, role });
      try {
        await audit.log(null, 'Public AI Assistant Query', message.slice(0, 140), req.ip);
      } catch (auditErr) {
        console.warn('[ai] audit log failed, continuing without it', auditErr.message);
      }
      return res.json({
        reply: result.reply,
        toolsUsed: result.toolsUsed || [],
        provider: result.provider || 'gemini',
        citations: result.citations || [],
        interactionId: result.interactionId || null,
      });
    } catch (err) {
      lastError = err;
      console.error('[ai] primary Gemini provider failed; trying OpenRouter fallback:', err.message);
    }
  }

  if (openrouterAi.enabled()) {
    try {
      const result = await openrouterAi.publicChat({ message, history, country, role });
      try {
        await audit.log(null, 'Public AI Assistant Query (fallback)', message.slice(0, 140), req.ip);
      } catch (auditErr) {
        console.warn('[ai] fallback audit log failed, continuing without it', auditErr.message);
      }
      return res.json({
        reply: result.reply,
        toolsUsed: result.toolsUsed || [],
        provider: result.provider || 'openrouter',
        citations: result.citations || [],
        fallback: true,
      });
    } catch (err) {
      lastError = err;
      console.error('[ai] OpenRouter fallback failed:', err.message);
    }
  }

  console.error('[ai] all public AI providers unavailable:', lastError?.message || 'no provider configured');
  return res.status(503).json({
    error: 'VTG AI is temporarily unavailable. Please try again shortly.',
    code: 'AI_PROVIDER_UNAVAILABLE',
  });
});

module.exports = { chat, publicChat, tradeIntelligence, status };
