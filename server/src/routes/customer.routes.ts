import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';
import { requirePermission, applyFieldLevelSecurity } from '../middleware';

const router = Router();
const controller = new CustomerController();

router.use(applyFieldLevelSecurity);

router.get('/', requirePermission('customer.view'), (req, res, next) => controller.getAll(req, res, next));
router.get('/stats', requirePermission('customer.view'), (req, res, next) => controller.getStats(req, res, next));
router.get('/:id', requirePermission('customer.view'), (req, res, next) => controller.getById(req, res, next));
router.get('/:id/profile', requirePermission('customer.purchase_history.view'), (req, res, next) => controller.getFullProfile(req, res, next));
router.post('/', requirePermission('customer.create'), (req, res, next) => controller.create(req, res, next));
router.put('/:id', requirePermission('customer.edit'), (req, res, next) => controller.update(req, res, next));
router.delete('/:id', requirePermission('customer.delete'), (req, res, next) => controller.delete(req, res, next));

export default router;
