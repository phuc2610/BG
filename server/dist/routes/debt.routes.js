"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const debt_controller_1 = require("../controllers/debt.controller");
const middleware_1 = require("../middleware");
const router = (0, express_1.Router)();
const controller = new debt_controller_1.DebtController();
router.use(middleware_1.applyFieldLevelSecurity);
router.get('/', (0, middleware_1.requirePermission)('customer.debt.view'), (req, res, next) => controller.getDebts(req, res, next));
router.get('/stats', (0, middleware_1.requirePermission)('customer.debt.view'), (req, res, next) => controller.getDebtStats(req, res, next));
router.post('/:invoiceId/payments', (0, middleware_1.requirePermission)('payment.create'), (req, res, next) => controller.recordPayment(req, res, next));
exports.default = router;
//# sourceMappingURL=debt.routes.js.map