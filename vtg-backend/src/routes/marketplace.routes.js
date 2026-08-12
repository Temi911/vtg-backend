const router = require('express').Router();
const ctrl = require('../controllers/marketplace.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/feed', ctrl.listFeed);
router.get('/storefront/:slug', ctrl.getStorefront);
router.post('/storefront', requireAuth, requireRole('supplier','bank'), ctrl.createStorefront);
router.post('/storefront/publish', requireAuth, requireRole('supplier','bank'), ctrl.publishStorefront);
router.post('/feed', requireAuth, ctrl.createFeedPost);
router.post('/feed/:postId/reactions', requireAuth, ctrl.reactToPost);
router.post('/enquiries', requireAuth, requireRole('buyer'), ctrl.createEnquiry);
router.get('/enquiries/mine', requireAuth, ctrl.listMyEnquiries);
router.post('/support', requireAuth, ctrl.createSupportTicket);
router.get('/support/mine', requireAuth, ctrl.listMyTickets);
router.post('/calls', requireAuth, ctrl.createVideoCall);

module.exports = router;
