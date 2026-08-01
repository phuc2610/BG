"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const invoice_controller_1 = require("../controllers/invoice.controller");
const router = (0, express_1.Router)();
const controller = new invoice_controller_1.InvoiceController();
router.get('/', (req, res, next) => controller.getAll(req, res, next));
router.get('/stats', (req, res, next) => controller.getStats(req, res, next));
router.post('/from-quote/:quoteId', (req, res, next) => controller.createFromQuote(req, res, next));
router.get('/:id', (req, res, next) => controller.getById(req, res, next));
router.post('/:id/select-serials', (req, res, next) => controller.selectSerials(req, res, next));
router.post('/:id/finalize', (req, res, next) => controller.finalize(req, res, next));
router.post('/:id/payments', (req, res, next) => controller.addPayment(req, res, next));
router.put('/:id/draft', (req, res, next) => controller.updateDraft(req, res, next));
router.put('/:id', (req, res, next) => controller.update(req, res, next));
router.post('/:id/cancel', (req, res, next) => controller.cancel(req, res, next));
exports.default = router;
//# sourceMappingURL=invoice.routes.js.map