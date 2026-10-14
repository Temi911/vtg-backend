const router = require('express').Router();
const ctrl = require('../controllers/payments.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.post('/', requireAuth, requireRole('buyer'), ctrl.initiate);
router.get('/', requireAuth, ctrl.listMine);
router.get('/summary', requireAuth, ctrl.summary);
router.get('/ledger', requireAuth, ctrl.ledger);
router.get('/:id/reconciliation', requireAuth, ctrl.getReconciliation);
router.patch('/:id/status', requireAuth, requireRole('bank', 'admin'), ctrl.updateStatus);
// Rate tables remain readable for public market-intelligence previews. Executing a
// conversion is a buyer-workspace finance action and must require an authenticated buyer.
router.get('/forex-rates', ctrl.forexRates);
router.post('/forex/convert', requireAuth, requireRole('buyer'), ctrl.convert);
router.get('/compliance', ctrl.compliance);

module.exports = router;
