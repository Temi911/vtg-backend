const router = require('express').Router();
const ctrl = require('../controllers/compliance.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/audit-log', requireAuth, requireRole('bank', 'admin'), ctrl.listAuditLog);

module.exports = router;
