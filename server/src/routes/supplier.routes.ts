import { Router } from 'express';
import { SupplierController } from '../controllers/supplier.controller';

const router = Router();
const controller = new SupplierController();

router.get('/', (req, res, next) => controller.getAll(req, res, next));
router.get('/stats', (req, res, next) => controller.getStats(req, res, next));
router.get('/:id', (req, res, next) => controller.getById(req, res, next));
router.get('/:id/profile', (req, res, next) => controller.getFullProfile(req, res, next));
router.post('/', (req, res, next) => controller.create(req, res, next));
router.put('/:id', (req, res, next) => controller.update(req, res, next));
router.delete('/:id', (req, res, next) => controller.delete(req, res, next));

export default router;
