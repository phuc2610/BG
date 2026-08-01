"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const controller = new admin_controller_1.AdminController();
router.use(auth_middleware_1.authenticateUser);
router.use(auth_middleware_1.requireAdmin);
router.get('/users', (req, res, next) => controller.getUsers(req, res, next));
router.patch('/users/:id/activate', (req, res, next) => controller.activateUser(req, res, next));
router.patch('/users/:id/block', (req, res, next) => controller.blockUser(req, res, next));
router.patch('/users/:id/unblock', (req, res, next) => controller.unblockUser(req, res, next));
router.delete('/users/:id', (req, res, next) => controller.deleteUser(req, res, next));
exports.default = router;
//# sourceMappingURL=admin.routes.js.map