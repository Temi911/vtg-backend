const router = require('express').Router();
const ctrl = require('../controllers/shipments.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.post('/', requireAuth, requireRole('supplier'), ctrl.create);
router.get('/order/:orderId', requireAuth, ctrl.getForOrder);
router.post('/:shipmentId/events', requireAuth, requireRole('supplier', 'bank', 'admin'), ctrl.addEvent);

module.exports = router;
