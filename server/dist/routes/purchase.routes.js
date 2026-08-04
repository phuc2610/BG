"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const purchase_controller_1 = require("../controllers/purchase.controller");
const middleware_1 = require("../middleware");
const router = (0, express_1.Router)();
const controller = new purchase_controller_1.PurchaseController();
router.use(middleware_1.applyFieldLevelSecurity);
router.get('/', (0, middleware_1.requirePermission)('purchase.view'), (req, res, next) => controller.getAll(req, res, next));
router.get('/stats', (0, middleware_1.requirePermission)('purchase.view'), (req, res, next) => controller.getStats(req, res, next));
router.get('/:id', (0, middleware_1.requirePermission)('purchase.view'), (req, res, next) => controller.getById(req, res, next));
router.post('/', (0, middleware_1.requirePermission)('purchase.create'), (req, res, next) => controller.create(req, res, next));
router.post('/:id/payments', (0, middleware_1.requirePermission)('purchase.payment.create'), (req, res, next) => controller.addPayment(req, res, next));
exports.default = router;
//# sourceMappingURL=purchase.routes.js.map