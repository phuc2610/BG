"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const inventory_controller_1 = require("../controllers/inventory.controller");
const middleware_1 = require("../middleware");
const router = (0, express_1.Router)();
const controller = new inventory_controller_1.InventoryController();
router.use(middleware_1.applyFieldLevelSecurity);
router.get('/', (0, middleware_1.requirePermission)('inventory.view'), (req, res, next) => controller.getAll(req, res, next));
router.get('/:id', (0, middleware_1.requirePermission)('inventory.view'), (req, res, next) => controller.getById(req, res, next));
router.post('/', (0, middleware_1.requirePermission)('inventory.adjust'), (req, res, next) => controller.create(req, res, next));
router.put('/:id', (0, middleware_1.requirePermission)('inventory.adjust'), (req, res, next) => controller.update(req, res, next));
router.delete('/:id', (0, middleware_1.requirePermission)('inventory.adjust'), (req, res, next) => controller.delete(req, res, next));
exports.default = router;
//# sourceMappingURL=inventory.routes.js.map