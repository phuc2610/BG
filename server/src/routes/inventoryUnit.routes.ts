import { Router } from 'express';
import { InventoryUnitController } from '../controllers/inventoryUnit.controller';
import { requirePermission, applyFieldLevelSecurity } from '../middleware';

const router = Router();
const controller = new InventoryUnitController();

router.use(applyFieldLevelSecurity);

router.get('/', requirePermission('inventory.serial.view'), (req, res, next) => controller.getAll(req, res, next));
router.get('/grouped', requirePermission('inventory.view'), (req, res, next) => controller.getGroupedInventory(req, res, next));
router.get('/by-condition', requirePermission('inventory.condition.view'), (req, res, next) => controller.getGroupedByCondition(req, res, next));
router.get('/by-product/:productId', requirePermission('inventory.serial.view'), (req, res, next) => controller.getUnitsByProduct(req, res, next));
router.get('/:id', requirePermission('inventory.serial.view'), (req, res, next) => controller.getById(req, res, next));
router.patch('/:id/condition', requirePermission('inventory.adjust'), (req, res, next) => controller.updateCondition(req, res, next));

export default router;
