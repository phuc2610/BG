import { Router } from 'express';
import { PurchaseController } from '../controllers/purchase.controller';

const router = Router();
const controller = new PurchaseController();

router.get('/', (req, res, next) => controller.getAll(req, res, next));
router.get('/stats', (req, res, next) => controller.getStats(req, res, next));
router.get('/:id', (req, res, next) => controller.getById(req, res, next));
router.post('/', (req, res, next) => controller.create(req, res, next));
router.post('/:id/payments', (req, res, next) => controller.addPayment(req, res, next));

export default router;
