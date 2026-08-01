"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const controller = new auth_controller_1.AuthController();
router.post('/register', (req, res, next) => controller.register(req, res, next));
router.post('/login', (req, res, next) => controller.login(req, res, next));
router.post('/admin-login', (req, res, next) => controller.adminLogin(req, res, next));
router.get('/me', auth_middleware_1.authenticateUser, (req, res, next) => controller.me(req, res, next));
router.post('/logout', (req, res, next) => controller.logout(req, res, next));
exports.default = router;
//# sourceMappingURL=auth.routes.js.map