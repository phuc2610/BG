import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller';
import { upload } from '../middleware/upload';

const router = Router();
const controller = new SettingsController();

router.get('/', controller.get);
router.put('/', controller.update);
router.post('/logo', upload.single('logo'), controller.uploadLogo);
router.post('/qr', upload.single('qr'), controller.uploadQR);

export default router;
