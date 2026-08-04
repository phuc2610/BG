"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const customer_controller_1 = require("../controllers/customer.controller");
const middleware_1 = require("../middleware");
const router = (0, express_1.Router)();
const controller = new customer_controller_1.CustomerController();
router.use(middleware_1.applyFieldLevelSecurity);
router.get('/', (0, middleware_1.requirePermission)('customer.view'), (req, res, next) => controller.getAll(req, res, next));
router.get('/stats', (0, middleware_1.requirePermission)('customer.view'), (req, res, next) => controller.getStats(req, res, next));
router.get('/:id', (0, middleware_1.requirePermission)('customer.view'), (req, res, next) => controller.getById(req, res, next));
router.get('/:id/profile', (0, middleware_1.requirePermission)('customer.purchase_history.view'), (req, res, next) => controller.getFullProfile(req, res, next));
router.post('/', (0, middleware_1.requirePermission)('customer.create'), (req, res, next) => controller.create(req, res, next));
router.put('/:id', (0, middleware_1.requirePermission)('customer.edit'), (req, res, next) => controller.update(req, res, next));
router.delete('/:id', (0, middleware_1.requirePermission)('customer.delete'), (req, res, next) => controller.delete(req, res, next));
exports.default = router;
//# sourceMappingURL=customer.routes.js.map