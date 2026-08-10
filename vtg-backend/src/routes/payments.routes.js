const router = require('express').Router();
const ctrl = require('../controllers/payments.controller');
const { requireAuth } = require('../middleware/auth');

router.post('/', requireAuth, ctrl.initiate);
router.get('/', requireAuth, ctrl.listMine);
router.get('/forex-rates', ctrl.forexRates);
router.post('/forex/convert', ctrl.convert);
router.get('/compliance', ctrl.compliance);

module.exports = router;
