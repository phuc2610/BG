import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateUser } from '../middleware/auth.middleware';

const router = Router();
const controller = new AuthController();

router.post('/register', (req, res, next) => controller.register(req, res, next));
router.post('/login', (req, res, next) => controller.login(req, res, next));
router.post('/admin-login', (req, res, next) => controller.adminLogin(req, res, next));
router.get('/me', authenticateUser, (req, res, next) => controller.me(req, res, next));
router.put('/profile', authenticateUser, (req, res, next) => controller.updateProfile(req, res, next));
router.post('/logout', (req, res, next) => controller.logout(req, res, next));

export default router;
