"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const quote_controller_1 = require("../controllers/quote.controller");
const router = (0, express_1.Router)();
const controller = new quote_controller_1.QuoteController();
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);
router.patch('/:id/status', controller.updateStatus);
// Quote items routes
router.post('/:id/products', controller.addProduct);
router.delete('/:id/items/:itemId', controller.removeProduct);
router.patch('/:id/items/:itemId', controller.updateItem);
exports.default = router;
//# sourceMappingURL=quote.routes.js.map