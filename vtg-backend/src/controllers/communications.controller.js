const { z } = require('zod');
const { query } = require('../config/db');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');

const createRoomSchema = z.object({
  targetUserId: z.string().uuid(),
  roomType: z.enum(['chat', 'voice', 'video']).default('chat'),
});

const messageSchema = z.object({
  body: z.string().min(1),
});

const createConversation = asyncHandler(async (req, res) => {
  const { targetUserId, roomType } = createRoomSchema.parse(req.body);

  const { rows: existingRows } = await query(
    `SELECT c.id FROM conversations c
     JOIN conversation_participants cp1 ON cp1.conversation_id = c.id
     JOIN conversation_participants cp2 ON cp2.conversation_id = c.id
     WHERE cp1.user_id = $1 AND cp2.user_id = $2 AND c.order_id IS NULL
     LIMIT 1`,
    [req.user.id, targetUserId]
  );

  if (existingRows[0]) {
    return res.status(200).json({ conversation: existingRows[0] });
  }

  const { rows } = await query(
    `INSERT INTO conversations (order_id) VALUES (NULL) RETURNING *`
  );

  const conversation = rows[0];
  await query(
    `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)`,
    [conversation.id, req.user.id, targetUserId]
  );

  await query(
    `INSERT INTO communication_rooms (conversation_id, room_type, created_by_user_id)
     VALUES ($1, $2, $3)`,
    [conversation.id, roomType, req.user.id]
  );

  res.status(201).json({ conversation });
});

const sendMessage = asyncHandler(async (req, res) => {
  const { body } = messageSchema.parse(req.body);
  const conversationId = req.params.conversationId;

  const { rows } = await query(
    'INSERT INTO messages (conversation_id, sender_id, body, is_read) VALUES ($1, $2, $3, FALSE) RETURNING *',
    [conversationId, req.user.id, body]
  );

  res.status(201).json({ message: rows[0] });
});

const listRooms = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT cr.*, c.created_at
     FROM communication_rooms cr
     JOIN conversations c ON c.id = cr.conversation_id
     JOIN conversation_participants cp ON cp.conversation_id = c.id
     WHERE cp.user_id = $1
     ORDER BY cr.created_at DESC`,
    [req.user.id]
  );

  res.json({ rooms: rows });
});

const getInviteLink = asyncHandler(async (req, res) => {
  const roomId = req.params.roomId;
  const { rows } = await query('SELECT id, room_type FROM communication_rooms WHERE id = $1', [roomId]);

  if (!rows[0]) throw new AppError('Room not found', 404, 'COMMUNICATION_ROOM_NOT_FOUND');

  res.json({ inviteLink: `/communications/room/${roomId}?type=${rows[0].room_type}` });
});

module.exports = { createConversation, sendMessage, listRooms, getInviteLink };
