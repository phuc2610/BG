import { Router } from 'express';
import { SupplierController } from '../controllers/supplier.controller';
import { requirePermission, applyFieldLevelSecurity } from '../middleware';

const router = Router();
const controller = new SupplierController();

router.use(applyFieldLevelSecurity);

router.get('/', requirePermission('supplier.view'), (req, res, next) => controller.getAll(req, res, next));
router.get('/stats', requirePermission('supplier.view'), (req, res, next) => controller.getStats(req, res, next));
router.get('/:id', requirePermission('supplier.view'), (req, res, next) => controller.getById(req, res, next));
router.get('/:id/profile', requirePermission('supplier.purchase_history.view'), (req, res, next) => controller.getFullProfile(req, res, next));
router.post('/', requirePermission('supplier.create'), (req, res, next) => controller.create(req, res, next));
router.put('/:id', requirePermission('supplier.edit'), (req, res, next) => controller.update(req, res, next));
router.delete('/:id', requirePermission('supplier.delete'), (req, res, next) => controller.delete(req, res, next));

export default router;
