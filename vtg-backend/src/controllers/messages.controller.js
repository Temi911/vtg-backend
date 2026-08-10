const { z } = require('zod');
const { query } = require('../config/db');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');

const listConversations = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT c.*, o.reference AS order_reference,
       (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
       (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.is_read = FALSE AND m.sender_id != $1) AS unread_count
     FROM conversations c
     JOIN conversation_participants cp ON cp.conversation_id = c.id
     LEFT JOIN orders o ON o.id = c.order_id
     WHERE cp.user_id = $1
     ORDER BY c.created_at DESC`,
    [req.user.id]
  );
  res.json({ conversations: rows });
});

async function assertParticipant(conversationId, userId) {
  const { rows } = await query('SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2', [conversationId, userId]);
  if (!rows[0]) throw new AppError('You are not part of this conversation', 403, 'FORBIDDEN');
}

const listMessages = asyncHandler(async (req, res) => {
  await assertParticipant(req.params.conversationId, req.user.id);
  const { rows } = await query('SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC', [req.params.conversationId]);
  await query('UPDATE messages SET is_read = TRUE WHERE conversation_id = $1 AND sender_id != $2', [req.params.conversationId, req.user.id]);
  res.json({ messages: rows });
});

const sendSchema = z.object({ body: z.string().min(1) });

const sendMessage = asyncHandler(async (req, res) => {
  await assertParticipant(req.params.conversationId, req.user.id);
  const { body } = sendSchema.parse(req.body);
  const { rows } = await query(
    'INSERT INTO messages (conversation_id, sender_id, body) VALUES ($1,$2,$3) RETURNING *',
    [req.params.conversationId, req.user.id, body]
  );
  res.status(201).json({ message: rows[0] });
});

module.exports = { listConversations, listMessages, sendMessage };
