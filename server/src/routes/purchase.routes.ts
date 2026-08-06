import { Router } from 'express';
import { PurchaseController } from '../controllers/purchase.controller';
import { requirePermission, applyFieldLevelSecurity } from '../middleware';

const router = Router();
const controller = new PurchaseController();

router.use(applyFieldLevelSecurity);

router.get('/', requirePermission('purchase.view'), (req, res, next) => controller.getAll(req, res, next));
router.get('/stats', requirePermission('purchase.view'), (req, res, next) => controller.getStats(req, res, next));
router.get('/:id', requirePermission('purchase.view'), (req, res, next) => controller.getById(req, res, next));
router.post('/', requirePermission('purchase.create'), (req, res, next) => controller.create(req, res, next));
router.put('/:id', requirePermission('purchase.create'), (req, res, next) => controller.update(req, res, next));
router.delete('/:id', requirePermission('purchase.create'), (req, res, next) => controller.delete(req, res, next));
router.post('/:id/payments', requirePermission('purchase.payment.create'), (req, res, next) => controller.addPayment(req, res, next));

export default router;
