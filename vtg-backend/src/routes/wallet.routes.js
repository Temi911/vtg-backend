const router = require('express').Router();
const ctrl = require('../controllers/wallet.controller');
const { requireAuth } = require('../middleware/auth');

router.get('/balances', requireAuth, ctrl.getBalances);
router.get('/transactions', requireAuth, ctrl.getTransactions);
router.post('/send', requireAuth, ctrl.send);

module.exports = router;
