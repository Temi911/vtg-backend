const router = require('express').Router();
const ctrl = require('../controllers/documents.controller');
const { requireAuth, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.post('/', requireAuth, upload.single('file'), ctrl.upload);
router.get('/order/:orderId', requireAuth, ctrl.listForOrder);
router.get('/:id/download', requireAuth, ctrl.download);
router.patch('/:id/verify', requireAuth, requireRole('bank'), ctrl.verify);

module.exports = router;
