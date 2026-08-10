const router = require('express').Router();
const ctrl = require('../controllers/location.controller');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, ctrl.getLocation);
router.post('/', requireAuth, ctrl.shareLocation);

module.exports = router;
