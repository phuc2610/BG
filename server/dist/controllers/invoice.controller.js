"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceController = void 0;
const invoice_service_1 = require("../services/invoice.service");
const invoiceService = new invoice_service_1.InvoiceService();
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
class InvoiceController {
    // GET /api/invoices
    getAll = asyncHandler(async (req, res) => {
        const result = await invoiceService.getAll(req.query);
        res.json({ success: true, ...result });
    });
    // GET /api/invoices/stats
    getStats = asyncHandler(async (_req, res) => {
        const stats = await invoiceService.getStats();
        res.json({ success: true, data: stats });
    });
    // GET /api/invoices/:id
    getById = asyncHandler(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const invoice = await invoiceService.getById(id);
        res.json({ success: true, data: invoice });
    });
    // POST /api/invoices/from-quote/:quoteId
    createFromQuote = asyncHandler(async (req, res) => {
        const quoteId = Array.isArray(req.params.quoteId)
            ? req.params.quoteId[0]
            : req.params.quoteId;
        const { createdBy } = req.body;
        const invoice = await invoiceService.createFromQuote(quoteId, createdBy);
        res.status(201).json({ success: true, data: invoice });
    });
    // POST /api/invoices/:id/payments
    addPayment = asyncHandler(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const invoice = await invoiceService.addPayment(id, req.body);
        res.json({ success: true, data: invoice });
    });
    // PUT /api/invoices/:id/draft
    updateDraft = asyncHandler(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const invoice = await invoiceService.updateDraftInvoice(id, req.body);
        res.json({ success: true, data: invoice });
    });
    // POST /api/invoices/:id/select-serials
    selectSerials = asyncHandler(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { itemIndex, selectedSerials } = req.body;
        const invoice = await invoiceService.selectSerialsForDraftItem(id, itemIndex, selectedSerials);
        res.json({ success: true, data: invoice });
    });
    // POST /api/invoices/:id/finalize
    finalize = asyncHandler(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const invoice = await invoiceService.finalizeInvoice(id, req.body);
        res.json({ success: true, data: invoice });
    });
    // PUT /api/invoices/:id
    update = asyncHandler(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const invoice = await invoiceService.updateDraftInvoice(id, req.body);
        res.json({ success: true, data: invoice });
    });
    // POST /api/invoices/:id/cancel
    cancel = asyncHandler(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { reason } = req.body;
        const invoice = await invoiceService.cancel(id, reason);
        res.json({ success: true, data: invoice });
    });
}
exports.InvoiceController = InvoiceController;
//# sourceMappingURL=invoice.controller.js.map