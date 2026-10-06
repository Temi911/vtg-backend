const router=require('express').Router();
const ctrl=require('../controllers/admin-trade.controller');
const {requireAuth,requireRole}=require('../middleware/auth');
router.get('/overview',requireAuth,requireRole('admin'),ctrl.overview);
router.get('/orders/:id',requireAuth,requireRole('admin'),ctrl.getOrder);
router.get('/lcs/:id',requireAuth,requireRole('admin'),ctrl.getLC);
router.get('/operations',requireAuth,requireRole('admin'),ctrl.operations);
module.exports=router;