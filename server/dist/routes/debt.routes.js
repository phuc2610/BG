"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const debt_controller_1 = require("../controllers/debt.controller");
const router = (0, express_1.Router)();
const controller = new debt_controller_1.DebtController();
router.get('/', (req, res, next) => controller.getDebts(req, res, next));
router.get('/stats', (req, res, next) => controller.getDebtStats(req, res, next));
router.post('/:invoiceId/payments', (req, res, next) => controller.recordPayment(req, res, next));
exports.default = router;
//# sourceMappingURL=debt.routes.js.map