import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { validate } from '../middleware';
import { upload } from '../middleware/upload';
import { createProductSchema, updateProductSchema } from '../utils/validators';

const router = Router();
const controller = new ProductController();

router.get('/', controller.getAll);
router.get('/stats', controller.getStats);
router.get('/brands', controller.getBrands);
router.get('/:id', controller.getById);
router.post('/', validate(createProductSchema), controller.create);
router.put('/:id', validate(updateProductSchema), controller.update);
router.delete('/:id', controller.delete);
router.post('/:id/clone', controller.clone);

// Image routes
router.post('/:id/images', upload.array('images', 10), controller.uploadImages);
router.delete('/:id/images/:imageId', controller.deleteImage);

export default router;
