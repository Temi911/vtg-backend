const router = require('express').Router();
const ctrl = require('../controllers/storefront-admin.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/mine', requireAuth, requireRole('supplier','bank'), ctrl.getMine);
router.patch('/:storefrontId', requireAuth, requireRole('supplier','bank'), ctrl.updateStorefront);
router.post('/:storefrontId/links', requireAuth, requireRole('supplier','bank'), ctrl.addLink);
router.delete('/:storefrontId/links/:linkId', requireAuth, requireRole('supplier','bank'), ctrl.removeLink);

// Shared identity/branding endpoints. These remain under the existing mounted route
// so no separate server wiring is required.
router.get('/profile/me', requireAuth, ctrl.profileMe);
router.post('/profile/me/image', requireAuth, ...ctrl.uploadProfileImage);
router.post('/profile/me/logo', requireAuth, ...ctrl.uploadOrganisationLogo);
router.get('/profile/:userId', ctrl.publicProfile);

module.exports = router;
