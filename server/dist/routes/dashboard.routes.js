"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const middleware_1 = require("../middleware");
const router = (0, express_1.Router)();
const controller = new dashboard_controller_1.DashboardController();
router.use(middleware_1.applyFieldLevelSecurity);
router.get('/stats', (0, middleware_1.requirePermission)('dashboard.view'), controller.getStats);
router.get('/recent', (0, middleware_1.requirePermission)('dashboard.view'), controller.getRecent);
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map