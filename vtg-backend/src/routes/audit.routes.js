const router=require('express').Router();
const ctrl=require('../controllers/audit.controller');
const {requireAuth}=require('../middleware/auth');
router.get('/mine',requireAuth,ctrl.listMine);
module.exports=router;
