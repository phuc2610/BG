"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const purchase_controller_1 = require("../controllers/purchase.controller");
const router = (0, express_1.Router)();
const controller = new purchase_controller_1.PurchaseController();
router.get('/', (req, res, next) => controller.getAll(req, res, next));
router.get('/stats', (req, res, next) => controller.getStats(req, res, next));
router.get('/:id', (req, res, next) => controller.getById(req, res, next));
router.post('/', (req, res, next) => controller.create(req, res, next));
router.post('/:id/payments', (req, res, next) => controller.addPayment(req, res, next));
exports.default = router;
//# sourceMappingURL=purchase.routes.js.map