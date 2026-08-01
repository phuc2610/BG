"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierController = void 0;
const supplier_service_1 = require("../services/supplier.service");
const supplierService = new supplier_service_1.SupplierService();
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
class SupplierController {
    // GET /api/suppliers
    getAll = asyncHandler(async (req, res) => {
        const result = await supplierService.getAll(req.query);
        res.json({ success: true, ...result });
    });
    // GET /api/suppliers/stats
    getStats = asyncHandler(async (req, res) => {
        const ownerId = req.user?.id || req.query?.ownerId;
        const stats = await supplierService.getStats(ownerId);
        res.json({ success: true, data: stats });
    });
    // GET /api/suppliers/:id
    getById = asyncHandler(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const supplier = await supplierService.getById(id);
        res.json({ success: true, data: supplier });
    });
    // GET /api/suppliers/:id/profile
    getFullProfile = asyncHandler(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const profile = await supplierService.getFullProfile(id);
        res.json({ success: true, data: profile });
    });
    // POST /api/suppliers
    create = asyncHandler(async (req, res) => {
        const supplier = await supplierService.create(req.body);
        res.status(201).json({ success: true, data: supplier });
    });
    // PUT /api/suppliers/:id
    update = asyncHandler(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const supplier = await supplierService.update(id, req.body);
        res.json({ success: true, data: supplier });
    });
    // DELETE /api/suppliers/:id
    delete = asyncHandler(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        await supplierService.delete(id);
        res.json({ success: true, message: 'Đã xóa nhà cung cấp' });
    });
}
exports.SupplierController = SupplierController;
//# sourceMappingURL=supplier.controller.js.map