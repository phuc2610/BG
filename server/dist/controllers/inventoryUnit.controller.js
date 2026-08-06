"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryUnitController = void 0;
const inventoryUnit_service_1 = require("../services/inventoryUnit.service");
const unitService = new inventoryUnit_service_1.InventoryUnitService();
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
class InventoryUnitController {
    // GET /api/inventory-units
    getAll = asyncHandler(async (req, res) => {
        const result = await unitService.getAll(req.query);
        res.json({ success: true, ...result });
    });
    // GET /api/inventory-units/grouped
    getGroupedInventory = asyncHandler(async (req, res) => {
        const data = await unitService.getGroupedInventory(req.query);
        res.json({ success: true, data });
    });
    // GET /api/inventory-units/by-condition
    getGroupedByCondition = asyncHandler(async (req, res) => {
        const data = await unitService.getGroupedInventoryByCondition(req.query);
        res.json({ success: true, data });
    });
    // GET /api/inventory-units/by-product/:productId
    getUnitsByProduct = asyncHandler(async (req, res) => {
        const productId = Array.isArray(req.params.productId)
            ? req.params.productId[0]
            : req.params.productId;
        const units = await unitService.getUnitsByProduct(productId);
        res.json({ success: true, data: units });
    });
    // GET /api/inventory-units/:id
    getById = asyncHandler(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const unit = await unitService.getById(id);
        res.json({ success: true, data: unit });
    });
    // PATCH /api/inventory-units/:id/condition
    updateCondition = asyncHandler(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { condition } = req.body;
        const unit = await unitService.updateUnitCondition(id, condition);
        res.json({ success: true, data: unit });
    });
    // PATCH /api/inventory-units/:id/list-price
    updateListPrice = asyncHandler(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { listPrice } = req.body;
        const unit = await unitService.updateListPrice(id, listPrice);
        res.json({ success: true, data: unit });
    });
}
exports.InventoryUnitController = InventoryUnitController;
//# sourceMappingURL=inventoryUnit.controller.js.map