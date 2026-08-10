const { query } = require('../config/db');

async function log(actorId, action, detail, ipAddress) {
  await query(
    'INSERT INTO audit_log (actor_id, action, detail, ip_address) VALUES ($1, $2, $3, $4)',
    [actorId || null, action, detail || null, ipAddress || null]
  );
}

async function list({ limit = 100 } = {}) {
  const { rows } = await query(
    `SELECT al.*, u.full_name AS actor_name, u.role AS actor_role
     FROM audit_log al
     LEFT JOIN users u ON u.id = al.actor_id
     ORDER BY al.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

module.exports = { log, list };
