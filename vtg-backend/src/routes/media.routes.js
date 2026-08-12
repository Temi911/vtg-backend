const router = require('express').Router();
const ctrl = require('../controllers/media.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.post('/products/:productId', requireAuth, requireRole('supplier'), ...ctrl.uploadProductMedia);
router.post('/storefronts/:storefrontId', requireAuth, requireRole('supplier','bank'), ...ctrl.uploadCompanyMedia);
router.post('/feed/:postId', requireAuth, ...ctrl.uploadFeedMedia);

module.exports = router;
