const router=require('express').Router();
const ctrl=require('../controllers/trade-risk.controller');
const {requireAuth,requireRole}=require('../middleware/auth');
router.get('/orders/:orderId',requireAuth,ctrl.scan);
router.get('/portfolio',requireAuth,ctrl.portfolio);
router.get('/actions',requireAuth,ctrl.actions);
router.post('/automation/run',requireAuth,requireRole('admin'),ctrl.run);
router.patch('/actions/:id',requireAuth,ctrl.update);
module.exports=router;