"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
    getStats = asyncHandler(async (req, res) => {
        const { startDate, endDate } = req.query;
        const stats = await invoiceService.getStats(startDate, endDate);
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
        const creatorName = req.user?.fullName || req.user?.username || req.body?.createdBy;
        const invoice = await invoiceService.createFromQuote(quoteId, creatorName);
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
    // POST /api/invoices/:id/return
    processReturn = asyncHandler(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const creatorName = req.user?.fullName || req.user?.username || 'Admin';
        const { ReturnExchangeService } = await Promise.resolve().then(() => __importStar(require('../services/returnExchange.service')));
        const returnService = new ReturnExchangeService();
        const result = await returnService.processReturn(id, req.body, creatorName);
        res.json({ success: true, data: result });
    });
    // POST /api/invoices/:id/exchange
    processExchange = asyncHandler(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const creatorName = req.user?.fullName || req.user?.username || 'Admin';
        const { ReturnExchangeService } = await Promise.resolve().then(() => __importStar(require('../services/returnExchange.service')));
        const returnService = new ReturnExchangeService();
        const result = await returnService.processExchange(id, req.body, creatorName);
        res.json({ success: true, data: result });
    });
    // GET /api/invoices/:id/return-exchange-history
    getReturnExchangeHistory = asyncHandler(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { ReturnExchangeService } = await Promise.resolve().then(() => __importStar(require('../services/returnExchange.service')));
        const returnService = new ReturnExchangeService();
        const history = await returnService.getInvoiceTransactions(id);
        res.json({ success: true, data: history });
    });
}
exports.InvoiceController = InvoiceController;
//# sourceMappingURL=invoice.controller.js.map