import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { validate, requirePermission, applyFieldLevelSecurity } from '../middleware';
import { upload } from '../middleware/upload';
import { createProductSchema, updateProductSchema } from '../utils/validators';

const router = Router();
const controller = new ProductController();

router.use(applyFieldLevelSecurity);

router.get('/', requirePermission('product.view'), controller.getAll);
router.get('/stats', requirePermission('product.view'), controller.getStats);
router.get('/brands', requirePermission('product.view'), controller.getBrands);
router.get('/:id', requirePermission('product.view'), controller.getById);
router.post('/', requirePermission('product.create'), validate(createProductSchema), controller.create);
router.put('/:id', requirePermission('product.edit'), validate(updateProductSchema), controller.update);
router.delete('/:id', requirePermission('product.delete'), controller.delete);
router.post('/:id/clone', requirePermission('product.create'), controller.clone);

// Image routes
router.post('/:id/images', requirePermission('product.edit'), upload.array('images', 10), controller.uploadImages);
router.delete('/:id/images/:imageId', requirePermission('product.edit'), controller.deleteImage);

export default router;
