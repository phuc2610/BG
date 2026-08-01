"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebtController = void 0;
const debt_service_1 = require("../services/debt.service");
const debtService = new debt_service_1.DebtService();
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
class DebtController {
    // GET /api/debts
    getDebts = asyncHandler(async (req, res) => {
        const result = await debtService.getDebts(req.query);
        res.json({ success: true, ...result });
    });
    // GET /api/debts/stats
    getDebtStats = asyncHandler(async (req, res) => {
        const ownerId = req.user?.id || req.query.ownerId;
        const stats = await debtService.getDebtStats(ownerId);
        res.json({ success: true, data: stats });
    });
    // POST /api/debts/:invoiceId/payments
    recordPayment = asyncHandler(async (req, res) => {
        const invoiceId = Array.isArray(req.params.invoiceId)
            ? req.params.invoiceId[0]
            : req.params.invoiceId;
        const invoice = await debtService.recordPayment(invoiceId, req.body);
        res.json({ success: true, data: invoice });
    });
}
exports.DebtController = DebtController;
//# sourceMappingURL=debt.controller.js.map