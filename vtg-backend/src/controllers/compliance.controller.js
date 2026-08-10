const { asyncHandler } = require('../utils/asyncHandler');
const audit = require('../services/audit.service');

const listAuditLog = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const entries = await audit.list({ limit });
  res.json({ entries });
});

module.exports = { listAuditLog };
