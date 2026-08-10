const { z } = require('zod');
const { asyncHandler } = require('../utils/asyncHandler');
const { AppError } = require('../utils/AppError');
const { query } = require('../config/db');
const ai = require('../services/ai.service');
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

// Pre-login assistant — no auth, no account context, a deliberately
// narrow tool set (see ai.service.js). Still logged to the audit trail
// with a null actor so abuse patterns are visible.
const publicChat = asyncHandler(async (req, res) => {
  const { message, history, country, role } = chatSchema.parse(req.body);
  const fullHistory = [...history, { role: 'user', content: message }];

  const result = await ai.publicChat({ history: fullHistory, country, role });

  try {
    await audit.log(null, 'Public AI Assistant Query', message.slice(0, 140), req.ip);
  } catch (auditErr) {
    console.warn('[ai] audit log failed, continuing without it', auditErr.message);
  }
  res.json({ reply: result.reply, toolsUsed: result.toolsUsed });
});

module.exports = { chat, publicChat };
