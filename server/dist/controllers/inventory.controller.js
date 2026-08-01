"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryController = void 0;
const inventory_service_1 = require("../services/inventory.service");
const inventoryService = new inventory_service_1.InventoryService();
class InventoryController {
    async getAll(req, res, next) {
        try {
            const result = await inventoryService.search(req.query);
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async getById(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const item = await inventoryService.getById(id);
            res.json({ success: true, data: item });
        }
        catch (error) {
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            const lot = await inventoryService.create(req.body);
            res.status(201).json({ success: true, data: lot });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const lot = await inventoryService.update(id, req.body);
            res.json({ success: true, data: lot });
        }
        catch (error) {
            next(error);
        }
    }
    async delete(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            await inventoryService.delete(id);
            res.json({ success: true, message: 'Đã xóa lô hàng khỏi kho' });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.InventoryController = InventoryController;
//# sourceMappingURL=inventory.controller.js.map