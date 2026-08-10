const router = require('express').Router();
const ctrl = require('../controllers/preferences.controller');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, ctrl.getPreferences);
router.patch('/language', requireAuth, ctrl.updateLanguage);

module.exports = router;
