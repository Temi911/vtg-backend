const router = require('express').Router();
const ctrl = require('../controllers/products.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', ctrl.list);
router.get('/mine', requireAuth, requireRole('supplier'), ctrl.listMine);
router.get('/:id', ctrl.getOne);
router.post('/', requireAuth, requireRole('supplier'), ctrl.create);
router.patch('/:id', requireAuth, requireRole('supplier'), ctrl.update);
router.delete('/:id', requireAuth, requireRole('supplier'), ctrl.remove);

module.exports = router;
