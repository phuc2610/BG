import { Router } from 'express';
import { DebtController } from '../controllers/debt.controller';
import { requirePermission, applyFieldLevelSecurity } from '../middleware';

const router = Router();
const controller = new DebtController();

router.use(applyFieldLevelSecurity);

router.get('/', requirePermission('customer.debt.view'), (req, res, next) => controller.getDebts(req, res, next));
router.get('/stats', requirePermission('customer.debt.view'), (req, res, next) => controller.getDebtStats(req, res, next));
router.post('/:invoiceId/payments', requirePermission('payment.create'), (req, res, next) => controller.recordPayment(req, res, next));

export default router;
