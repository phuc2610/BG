"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const inventoryUnit_controller_1 = require("../controllers/inventoryUnit.controller");
const router = (0, express_1.Router)();
const controller = new inventoryUnit_controller_1.InventoryUnitController();
router.get('/', (req, res, next) => controller.getAll(req, res, next));
router.get('/grouped', (req, res, next) => controller.getGroupedInventory(req, res, next));
router.get('/by-condition', (req, res, next) => controller.getGroupedByCondition(req, res, next));
router.get('/by-product/:productId', (req, res, next) => controller.getUnitsByProduct(req, res, next));
router.get('/:id', (req, res, next) => controller.getById(req, res, next));
router.patch('/:id/condition', (req, res, next) => controller.updateCondition(req, res, next));
exports.default = router;
//# sourceMappingURL=inventoryUnit.routes.js.map