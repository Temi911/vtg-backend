const router = require('express').Router();
const ctrl = require('../controllers/orders.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.post('/', requireAuth, requireRole('buyer'), ctrl.create);
router.get('/', requireAuth, ctrl.listMine);
router.get('/:id', requireAuth, ctrl.getOne);
router.patch('/:id/status', requireAuth, ctrl.updateStatus);

module.exports = router;
