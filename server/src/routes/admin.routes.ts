import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticateUser, requireAdmin } from '../middleware/auth.middleware';

const router = Router();
const controller = new AdminController();

router.use(authenticateUser);
router.use(requireAdmin);

router.get('/users', (req, res, next) => controller.getUsers(req, res, next));
router.put('/users/:id', (req, res, next) => controller.updateUser(req, res, next));
router.get('/users/:id/permissions', (req, res, next) => controller.getUserPermissions(req, res, next));
router.put('/users/:id/permissions', (req, res, next) => controller.updateUserPermissions(req, res, next));
router.patch('/users/:id/activate', (req, res, next) => controller.activateUser(req, res, next));
router.patch('/users/:id/block', (req, res, next) => controller.blockUser(req, res, next));
router.patch('/users/:id/unblock', (req, res, next) => controller.unblockUser(req, res, next));
router.post('/users/:id/reset-password', (req, res, next) => controller.resetUserPassword(req, res, next));
router.delete('/users/:id', (req, res, next) => controller.deleteUser(req, res, next));

export default router;
