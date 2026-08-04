import { Router } from 'express';
import { QuoteController } from '../controllers/quote.controller';
import { requirePermission, applyFieldLevelSecurity } from '../middleware';

const router = Router();
const controller = new QuoteController();

router.use(applyFieldLevelSecurity);

router.get('/', requirePermission('quote.view'), controller.getAll);
router.get('/:id', requirePermission('quote.view'), controller.getById);
router.post('/', requirePermission('quote.create'), controller.create);
router.put('/:id', requirePermission('quote.edit'), controller.update);
router.delete('/:id', requirePermission('quote.delete'), controller.delete);
router.patch('/:id/status', requirePermission('quote.finalize'), controller.updateStatus);

// Quote items routes
router.post('/:id/products', requirePermission('quote.edit'), controller.addProduct);
router.delete('/:id/items/:itemId', requirePermission('quote.edit'), controller.removeProduct);
router.patch('/:id/items/:itemId', requirePermission('quote.edit'), controller.updateItem);

export default router;
