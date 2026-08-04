import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller';
import { requirePermission, applyFieldLevelSecurity } from '../middleware';

const router = Router();
const controller = new InventoryController();

router.use(applyFieldLevelSecurity);

router.get('/', requirePermission('inventory.view'), (req, res, next) => controller.getAll(req, res, next));
router.get('/:id', requirePermission('inventory.view'), (req, res, next) => controller.getById(req, res, next));
router.post('/', requirePermission('inventory.adjust'), (req, res, next) => controller.create(req, res, next));
router.put('/:id', requirePermission('inventory.adjust'), (req, res, next) => controller.update(req, res, next));
router.delete('/:id', requirePermission('inventory.adjust'), (req, res, next) => controller.delete(req, res, next));

export default router;
