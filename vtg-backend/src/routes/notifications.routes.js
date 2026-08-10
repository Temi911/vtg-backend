const router = require('express').Router();
const ctrl = require('../controllers/notifications.controller');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, ctrl.list);
router.patch('/:id/read', requireAuth, ctrl.markRead);

module.exports = router;
