const { query } = require('../config/db');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const { rows } = await query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [req.user.id, limit]
  );
  res.json({ notifications: rows });
});

const markRead = asyncHandler(async (req, res) => {
  const { rows } = await query(
    'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) throw new AppError('Notification not found', 404);
  res.json({ notification: rows[0] });
});

module.exports = { list, markRead };
