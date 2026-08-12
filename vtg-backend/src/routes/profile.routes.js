const router = require('express').Router();
const ctrl = require('../controllers/profile.controller');
const { requireAuth } = require('../middleware/auth');

router.get('/me', requireAuth, ctrl.me);
router.post('/me/image', requireAuth, ...ctrl.updateImage);
router.post('/me/logo', requireAuth, ...ctrl.updateOrganisationLogo);
router.get('/:userId', ctrl.publicProfile);

module.exports = router;
