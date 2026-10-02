const router=require('express').Router();
const ctrl=require('../controllers/admin.controller');
const {requireAuth,requireRole}=require('../middleware/auth');
router.use(requireAuth,requireRole('admin'));
router.get('/dashboard',ctrl.dashboard);
router.get('/users',ctrl.users);
module.exports=router;