const router=require('express').Router();
const ctrl=require('../controllers/network.controller');
const {requireAuth,requireRole}=require('../middleware/auth');
router.get('/directory',requireAuth,ctrl.directory);
router.get('/relationships',requireAuth,ctrl.mine);
router.post('/relationships',requireAuth,ctrl.requestRelationship);
router.get('/partners/:id/performance',requireAuth,ctrl.performance);
router.patch('/relationships/:id/status',requireAuth,requireRole('admin'),ctrl.reviewRelationship);
module.exports=router;
