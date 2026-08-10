const router = require('express').Router();
const ctrl = require('../controllers/messages.controller');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, ctrl.listConversations);
router.get('/:conversationId/messages', requireAuth, ctrl.listMessages);
router.post('/:conversationId/messages', requireAuth, ctrl.sendMessage);

module.exports = router;
