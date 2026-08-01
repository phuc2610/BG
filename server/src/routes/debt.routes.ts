import { Router } from 'express';
import { DebtController } from '../controllers/debt.controller';

const router = Router();
const controller = new DebtController();

router.get('/', (req, res, next) => controller.getDebts(req, res, next));
router.get('/stats', (req, res, next) => controller.getDebtStats(req, res, next));
router.post('/:invoiceId/payments', (req, res, next) => controller.recordPayment(req, res, next));

export default router;
