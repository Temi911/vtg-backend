const router = require('express').Router();
const ctrl = require('../controllers/shipments.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.post('/', requireAuth, requireRole('supplier'), ctrl.create);
router.get('/atlas', requireAuth, ctrl.listForAtlas);
router.get('/:shipmentId/live-tracking', requireAuth, ctrl.getLiveTracking);
router.get('/:shipmentId/customs', requireAuth, ctrl.getCustoms);
router.post('/:shipmentId/customs', requireAuth, requireRole('supplier', 'bank', 'admin'), ctrl.createCustoms);
router.patch('/:shipmentId/customs', requireAuth, requireRole('supplier', 'bank', 'admin'), ctrl.updateCustoms);
router.patch('/:shipmentId/vessel', requireAuth, requireRole('supplier', 'bank', 'admin'), ctrl.updateVessel);
router.get('/order/:orderId', requireAuth, ctrl.getForOrder);
router.post('/:shipmentId/events', requireAuth, requireRole('supplier', 'bank', 'admin'), ctrl.addEvent);

module.exports = router;
