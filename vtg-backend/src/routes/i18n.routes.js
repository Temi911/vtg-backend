const router = require('express').Router();
const ctrl = require('../controllers/i18n.controller');

router.get('/config', ctrl.getTranslationConfig);

module.exports = router;
