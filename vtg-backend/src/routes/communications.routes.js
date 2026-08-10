const router = require('express').Router();
const ctrl = require('../controllers/communications.controller');
const { requireAuth } = require('../middleware/auth');

router.post('/conversations', requireAuth, ctrl.createConversation);
router.get('/rooms', requireAuth, ctrl.listRooms);
router.get('/rooms/:roomId/invite', requireAuth, ctrl.getInviteLink);
router.post('/conversations/:conversationId/messages', requireAuth, ctrl.sendMessage);

module.exports = router;
