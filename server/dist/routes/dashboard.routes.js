"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const router = (0, express_1.Router)();
const controller = new dashboard_controller_1.DashboardController();
router.get('/stats', controller.getStats);
router.get('/recent', controller.getRecent);
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map