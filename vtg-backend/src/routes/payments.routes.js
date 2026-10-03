const router = require('express').Router();
const ctrl = require('../controllers/payments.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.post('/', requireAuth, requireRole('buyer'), ctrl.initiate);
router.get('/', requireAuth, ctrl.listMine);
router.get('/ledger', requireAuth, ctrl.ledger);
router.get('/:id/reconciliation', requireAuth, ctrl.getReconciliation);
router.patch('/:id/status', requireAuth, requireRole('bank', 'admin'), ctrl.updateStatus);
router.get('/forex-rates', ctrl.forexRates);
router.post('/forex/convert', ctrl.convert);
router.get('/compliance', ctrl.compliance);

module.exports = router;
