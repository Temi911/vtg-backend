const { query } = require('../config/db');

async function notify(userId, title, body) {
  if (!userId) return;
  await query(
    'INSERT INTO notifications (user_id, title, body, channel) VALUES ($1,$2,$3,\'in_app\')',
    [userId, title, body || null]
  );
}

module.exports = { notify };
