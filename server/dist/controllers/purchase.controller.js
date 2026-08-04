"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchaseController = void 0;
const purchase_service_1 = require("../services/purchase.service");
const purchaseService = new purchase_service_1.PurchaseService();
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
class PurchaseController {
    // GET /api/purchases
    getAll = asyncHandler(async (req, res) => {
        const result = await purchaseService.getAll(req.query);
        res.json({ success: true, ...result });
    });
    // GET /api/purchases/stats
    getStats = asyncHandler(async (req, res) => {
        const { startDate, endDate } = req.query;
        const stats = await purchaseService.getPurchaseStats(startDate, endDate);
        res.json({ success: true, data: stats });
    });
    // GET /api/purchases/:id
    getById = asyncHandler(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const purchase = await purchaseService.getById(id);
        res.json({ success: true, data: purchase });
    });
    // POST /api/purchases
    create = asyncHandler(async (req, res) => {
        const purchase = await purchaseService.create(req.body);
        res.status(201).json({ success: true, data: purchase });
    });
    // POST /api/purchases/:id/payments
    addPayment = asyncHandler(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const purchase = await purchaseService.addPayment(id, req.body);
        res.json({ success: true, data: purchase });
    });
}
exports.PurchaseController = PurchaseController;
//# sourceMappingURL=purchase.controller.js.map