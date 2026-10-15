const router = require('express').Router();
const ctrl = require('../controllers/verification.controller');
const { requireAuth, requireRole } = require('../middleware/auth');
const { upload, validateUploadedFile } = require('../middleware/upload');
const { scanUploadedFile } = require('../middleware/malware-scan');

router.post('/documents', requireAuth, requireRole('supplier', 'bank', 'agent'), upload.single('file'), validateUploadedFile, scanUploadedFile, ctrl.upload);
router.get('/documents', requireAuth, ctrl.listMine);
router.get('/review-queue', requireAuth, requireRole('admin'), ctrl.reviewQueue);
router.get('/documents/:id/download', requireAuth, ctrl.download);
router.patch('/documents/:id/review', requireAuth, requireRole('admin'), ctrl.review);

module.exports = router;
