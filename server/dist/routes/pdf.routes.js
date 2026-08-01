"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middleware_1 = require("../middleware");
const quote_service_1 = require("../services/quote.service");
const invoice_service_1 = require("../services/invoice.service");
const pdf_service_1 = require("../services/pdf.service");
const router = (0, express_1.Router)();
const quoteService = new quote_service_1.QuoteService();
const invoiceService = new invoice_service_1.InvoiceService();
const pdfService = new pdf_service_1.PdfService();
// GET /api/pdf/quotes/:id
router.get('/quotes/:id', (0, middleware_1.asyncHandler)(async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const quote = await quoteService.getById(id);
    const pdfBuffer = await pdfService.generateQuotePdf(quote);
    res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${quote.quoteCode}.pdf"`,
        'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
}));
// GET /api/pdf/invoices/:id
router.get('/invoices/:id', (0, middleware_1.asyncHandler)(async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const invoice = await invoiceService.getById(id);
    const pdfBuffer = await pdfService.generateInvoicePdf(invoice);
    res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.invoiceCode}.pdf"`,
        'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
}));
exports.default = router;
//# sourceMappingURL=pdf.routes.js.map