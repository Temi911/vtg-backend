const router = require('express').Router();
const ctrl = require('../controllers/lc.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.post('/', requireAuth, requireRole('buyer'), ctrl.request);
router.get('/', requireAuth, ctrl.listMine);
router.get('/:id', requireAuth, ctrl.getOne);
router.patch('/:id/issue', requireAuth, requireRole('bank'), ctrl.issue);
router.patch('/:id/docs-presented', requireAuth, requireRole('supplier'), ctrl.docsPresented);
router.patch('/:id/verify-and-pay', requireAuth, requireRole('bank'), ctrl.verifyAndPay);

module.exports = router;
