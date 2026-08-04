import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { requirePermission, applyFieldLevelSecurity } from '../middleware';

const router = Router();
const controller = new DashboardController();

router.use(applyFieldLevelSecurity);

router.get('/stats', requirePermission('dashboard.view'), controller.getStats);
router.get('/recent', requirePermission('dashboard.view'), controller.getRecent);

export default router;
