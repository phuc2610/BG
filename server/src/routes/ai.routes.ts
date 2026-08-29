import { Router } from 'express';
import { AiController } from '../controllers/ai.controller';
import { upload } from '../middleware/upload';
import { requirePermission } from '../middleware';

const router = Router();
const controller = new AiController();

router.post('/generate-product-images', requirePermission('product.create'), (req, res, next) =>
  controller.generateProductImages(req, res, next)
);

router.post('/save-generated-image', requirePermission('product.create'), (req, res, next) =>
  controller.saveGeneratedImage(req, res, next)
);

router.post('/upload-image', requirePermission('product.create'), upload.single('image'), (req, res, next) =>
  controller.uploadImage(req, res, next)
);

router.post('/suggest-specs', requirePermission('product.create'), (req, res, next) =>
  controller.suggestProductSpecs(req, res, next)
);

export default router;
