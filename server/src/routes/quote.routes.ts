import { Router } from 'express';
import { QuoteController } from '../controllers/quote.controller';

const router = Router();
const controller = new QuoteController();

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);
router.patch('/:id/status', controller.updateStatus);

// Quote items routes
router.post('/:id/products', controller.addProduct);
router.delete('/:id/items/:itemId', controller.removeProduct);
router.patch('/:id/items/:itemId', controller.updateItem);

export default router;
