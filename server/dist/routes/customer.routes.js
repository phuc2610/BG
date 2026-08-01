"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const customer_controller_1 = require("../controllers/customer.controller");
const router = (0, express_1.Router)();
const controller = new customer_controller_1.CustomerController();
router.get('/', (req, res, next) => controller.getAll(req, res, next));
router.get('/stats', (req, res, next) => controller.getStats(req, res, next));
router.get('/:id', (req, res, next) => controller.getById(req, res, next));
router.get('/:id/profile', (req, res, next) => controller.getFullProfile(req, res, next));
router.post('/', (req, res, next) => controller.create(req, res, next));
router.put('/:id', (req, res, next) => controller.update(req, res, next));
router.delete('/:id', (req, res, next) => controller.delete(req, res, next));
exports.default = router;
//# sourceMappingURL=customer.routes.js.map