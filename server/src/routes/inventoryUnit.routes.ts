import { Router } from 'express';
import { InventoryUnitController } from '../controllers/inventoryUnit.controller';

const router = Router();
const controller = new InventoryUnitController();

router.get('/', (req, res, next) => controller.getAll(req, res, next));
router.get('/grouped', (req, res, next) => controller.getGroupedInventory(req, res, next));
router.get('/by-condition', (req, res, next) => controller.getGroupedByCondition(req, res, next));
router.get('/by-product/:productId', (req, res, next) => controller.getUnitsByProduct(req, res, next));
router.get('/:id', (req, res, next) => controller.getById(req, res, next));
router.patch('/:id/condition', (req, res, next) => controller.updateCondition(req, res, next));

export default router;
