const router = require('express').Router();
const ctrl = require('../controllers/trust-risk.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth, requireRole('admin'));
router.get('/', ctrl.listFlags);
router.post('/', ctrl.createFlag);
router.patch('/:id', ctrl.updateFlag);

module.exports = router;
