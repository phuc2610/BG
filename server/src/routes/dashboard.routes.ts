import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';

const router = Router();
const controller = new DashboardController();

router.get('/stats', controller.getStats);
router.get('/recent', controller.getRecent);

export default router;
