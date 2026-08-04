"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuoteController = void 0;
const quote_service_1 = require("../services/quote.service");
const middleware_1 = require("../middleware");
const quoteService = new quote_service_1.QuoteService();
class QuoteController {
    // GET /api/quotes
    getAll = (0, middleware_1.asyncHandler)(async (req, res) => {
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit) : 20;
        const search = req.query.search;
        const status = req.query.status;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const result = await quoteService.getAll({
            page,
            limit,
            search,
            status,
            startDate,
            endDate,
        });
        res.json({ success: true, ...result });
    });
    // GET /api/quotes/:id
    getById = (0, middleware_1.asyncHandler)(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const quote = await quoteService.getById(id);
        res.json({ success: true, data: quote });
    });
    // POST /api/quotes
    create = (0, middleware_1.asyncHandler)(async (req, res) => {
        const quote = await quoteService.create(req.body);
        res.status(201).json({ success: true, data: quote });
    });
    // PUT /api/quotes/:id
    update = (0, middleware_1.asyncHandler)(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const quote = await quoteService.update(id, req.body);
        res.json({ success: true, data: quote });
    });
    // DELETE /api/quotes/:id
    delete = (0, middleware_1.asyncHandler)(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        await quoteService.delete(id);
        res.json({ success: true, message: 'Đã xóa báo giá' });
    });
    // POST /api/quotes/:id/products
    addProduct = (0, middleware_1.asyncHandler)(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { inventoryItem, unitPrice, quantity, warranty, serialNumber, condition } = req.body;
        const quote = await quoteService.addInventoryItem(id, inventoryItem, unitPrice, quantity, warranty, serialNumber, condition);
        res.json({ success: true, data: quote });
    });
    // DELETE /api/quotes/:id/items/:itemId
    removeProduct = (0, middleware_1.asyncHandler)(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const itemId = Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId;
        const quote = await quoteService.removeProduct(id, itemId);
        res.json({ success: true, data: quote });
    });
    // PATCH /api/quotes/:id/items/:itemId
    updateItem = (0, middleware_1.asyncHandler)(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const itemId = Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId;
        const quote = await quoteService.updateItem(id, itemId, req.body);
        res.json({ success: true, data: quote });
    });
    // PATCH /api/quotes/:id/status
    updateStatus = (0, middleware_1.asyncHandler)(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const quote = await quoteService.updateStatus(id, req.body.status);
        res.json({ success: true, data: quote });
    });
}
exports.QuoteController = QuoteController;
//# sourceMappingURL=quote.controller.js.map