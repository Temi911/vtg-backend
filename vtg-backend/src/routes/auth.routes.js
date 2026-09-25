const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');

router.post('/signup/buyer', ctrl.registerBuyer);
router.post('/signup/supplier', ctrl.registerSupplier);
router.post('/signup/bank', ctrl.registerBank);
router.post('/send-verification-code', ctrl.sendVerificationCode);
router.post('/verify-email-code', ctrl.verifyEmailCode);
router.post('/login', ctrl.login);
router.post('/refresh', ctrl.refresh);
router.get('/me', requireAuth, ctrl.me);

module.exports = router;
