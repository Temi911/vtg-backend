const router=require('express').Router();
const ctrl=require('../controllers/quotes.controller');
const {requireAuth,requireRole}=require('../middleware/auth');

router.post('/',requireAuth,requireRole('buyer'),ctrl.create);
router.get('/',requireAuth,ctrl.listMine);
router.get('/:id',requireAuth,ctrl.getOne);
router.patch('/:id/status',requireAuth,ctrl.updateStatus);
router.post('/:id/convert-to-order',requireAuth,requireRole('buyer'),ctrl.convertToOrder);

module.exports=router;
