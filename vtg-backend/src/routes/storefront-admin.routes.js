const router = require('express').Router();
const ctrl = require('../controllers/storefront-admin.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/mine', requireAuth, requireRole('supplier','bank'), ctrl.getMine);
router.patch('/:storefrontId', requireAuth, requireRole('supplier','bank'), ctrl.updateStorefront);
router.post('/:storefrontId/links', requireAuth, requireRole('supplier','bank'), ctrl.addLink);
router.delete('/:storefrontId/links/:linkId', requireAuth, requireRole('supplier','bank'), ctrl.removeLink);

module.exports = router;
