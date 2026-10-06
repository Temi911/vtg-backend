const router=require('express').Router();
const ctrl=require('../controllers/integrations.controller');
const {requireAuth}=require('../middleware/auth');
router.get('/status',requireAuth,ctrl.integrationStatus);
router.get('/fx',requireAuth,ctrl.rates);
router.get('/vessel',requireAuth,ctrl.vessel);
router.get('/news',requireAuth,ctrl.newsFeed);
module.exports=router;
