const router=require('express').Router();
const ctrl=require('../controllers/trade-documents.controller');
const {requireAuth}=require('../middleware/auth');
router.get('/order/:orderId',requireAuth,ctrl.checklist);
router.post('/order/:orderId/initialize',requireAuth,ctrl.initialize);
router.patch('/order/:orderId/compliance',requireAuth,ctrl.updateCase);
router.patch('/:id/review',requireAuth,ctrl.reviewDocument);
module.exports=router;
