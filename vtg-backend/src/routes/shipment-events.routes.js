const router=require('express').Router();
const ctrl=require('../controllers/shipment-events.controller');
const {requireAuth}=require('../middleware/auth');
router.get('/:shipmentId',requireAuth,ctrl.events);
router.post('/:shipmentId',requireAuth,ctrl.append);
module.exports=router;
