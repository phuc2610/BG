import { Router } from 'express';
import { InvoiceController } from '../controllers/invoice.controller';
import { requirePermission, applyFieldLevelSecurity } from '../middleware';

const router = Router();
const controller = new InvoiceController();

router.use(applyFieldLevelSecurity);

router.get('/', requirePermission('invoice.view'), (req, res, next) => controller.getAll(req, res, next));
router.get('/stats', requirePermission('invoice.view'), (req, res, next) => controller.getStats(req, res, next));
router.post('/from-quote/:quoteId', requirePermission('invoice.create'), (req, res, next) => controller.createFromQuote(req, res, next));
router.get('/:id', requirePermission('invoice.view'), (req, res, next) => controller.getById(req, res, next));
router.post('/:id/select-serials', requirePermission('invoice.serial.select'), (req, res, next) => controller.selectSerials(req, res, next));
router.post('/:id/finalize', requirePermission('invoice.finalize'), (req, res, next) => controller.finalize(req, res, next));
router.post('/:id/payments', requirePermission('payment.create'), (req, res, next) => controller.addPayment(req, res, next));
router.put('/:id/draft', requirePermission('invoice.edit'), (req, res, next) => controller.updateDraft(req, res, next));
router.put('/:id', requirePermission('invoice.edit'), (req, res, next) => controller.update(req, res, next));
router.post('/:id/cancel', requirePermission('invoice.cancel'), (req, res, next) => controller.cancel(req, res, next));
router.post('/:id/return', requirePermission('invoice.edit'), (req, res, next) => controller.processReturn(req, res, next));
router.post('/:id/exchange', requirePermission('invoice.edit'), (req, res, next) => controller.processExchange(req, res, next));
router.get('/:id/return-exchange-history', requirePermission('invoice.view'), (req, res, next) => controller.getReturnExchangeHistory(req, res, next));
router.get('/:id/origin-details', requirePermission('invoice.view'), (req, res, next) => controller.getOriginDetails(req, res, next));

export default router;

