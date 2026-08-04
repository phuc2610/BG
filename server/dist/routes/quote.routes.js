"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const quote_controller_1 = require("../controllers/quote.controller");
const middleware_1 = require("../middleware");
const router = (0, express_1.Router)();
const controller = new quote_controller_1.QuoteController();
router.use(middleware_1.applyFieldLevelSecurity);
router.get('/', (0, middleware_1.requirePermission)('quote.view'), controller.getAll);
router.get('/:id', (0, middleware_1.requirePermission)('quote.view'), controller.getById);
router.post('/', (0, middleware_1.requirePermission)('quote.create'), controller.create);
router.put('/:id', (0, middleware_1.requirePermission)('quote.edit'), controller.update);
router.delete('/:id', (0, middleware_1.requirePermission)('quote.delete'), controller.delete);
router.patch('/:id/status', (0, middleware_1.requirePermission)('quote.finalize'), controller.updateStatus);
// Quote items routes
router.post('/:id/products', (0, middleware_1.requirePermission)('quote.edit'), controller.addProduct);
router.delete('/:id/items/:itemId', (0, middleware_1.requirePermission)('quote.edit'), controller.removeProduct);
router.patch('/:id/items/:itemId', (0, middleware_1.requirePermission)('quote.edit'), controller.updateItem);
exports.default = router;
//# sourceMappingURL=quote.routes.js.map