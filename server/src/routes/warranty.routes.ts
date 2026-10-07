import { Router } from 'express';
import { WarrantyController } from '../controllers/warranty.controller';
import { upload } from '../middleware/upload';

const router = Router();
const controller = new WarrantyController();

// 1. STAGE 1: OCR IMAGE ONLY (MUST NOT SEARCH WARRANTY)
router.post('/ocr', upload.single('image'), (req, res, next) => controller.processOcr(req, res, next));

// 2. STAGE 3: CONFIRM OCR DATA (MUST NOT SEARCH WARRANTY)
router.post('/ocr/:sessionId/confirm', (req, res, next) => controller.confirmOcr(req, res, next));

// 3. SEARCH PREVIEW (MUST NOT SEARCH WARRANTY)
router.post('/preview', (req, res, next) => controller.previewSearch(req, res, next));

// 4. ABSOLUTE SEARCH TRIGGER (ONLY WHEN USER EXPLICITLY CLICKS "TÌM BẢO HÀNH")
router.post('/search', (req, res, next) => controller.searchWarranty(req, res, next));

// 5. METADATA: GET AVAILABLE PROVIDERS
router.get('/providers', (req, res) => controller.getProviders(req, res));

// 6. HISTORY: GET SEARCH HISTORY
router.get('/history', (req, res, next) => controller.getHistory(req, res, next));
router.get('/history/:id', (req, res, next) => controller.getHistoryById(req, res, next));

export default router;
