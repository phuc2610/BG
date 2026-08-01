"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const repositories_1 = require("../repositories");
const models_1 = require("../models");
const product_service_1 = require("./product.service");
const inventoryRepo = new repositories_1.InventoryRepository();
const productRepo = new repositories_1.ProductRepository();
class InventoryService {
    async search(query) {
        return inventoryRepo.search(query);
    }
    async getById(id) {
        const item = await inventoryRepo.findById(id);
        if (!item)
            throw new product_service_1.AppError('Lô hàng không tồn tại trong kho', 404);
        return item;
    }
    async create(data) {
        const masterProduct = await productRepo.findById(data.product);
        if (!masterProduct)
            throw new product_service_1.AppError('Mã sản phẩm không tồn tại trong hệ thống', 404);
        const qty = Math.max(1, Number(data.quantity) || 1);
        const rawSerials = data.serialNumbers || [];
        const createdLots = [];
        for (let i = 0; i < qty; i++) {
            const stockCode = await (0, models_1.generateStockCode)();
            const itemSerial = (rawSerials[i] && rawSerials[i].trim()) || (i === 0 && data.serialNumber ? data.serialNumber.trim() : undefined);
            const lot = await inventoryRepo.create({
                stockCode,
                product: data.product,
                condition: data.condition,
                costPrice: data.costPrice,
                quantity: 1,
                supplier: data.supplier?.trim() || undefined,
                supplierWarranty: data.supplierWarranty?.trim() || undefined,
                serialNumber: itemSerial || undefined,
                serialNumbers: itemSerial ? [itemSerial] : [],
                importDate: new Date(),
                createdBy: 'Admin',
            });
            createdLots.push(lot);
        }
        return createdLots[0];
    }
    async update(id, data) {
        // Validate serialNumbers if both serialNumbers and quantity are provided
        if (data.serialNumbers) {
            const serials = data.serialNumbers.filter(s => s.trim());
            const existingLot = await inventoryRepo.findById(id);
            const targetQty = data.quantity !== undefined ? data.quantity : existingLot?.quantity || 0;
            if (serials.length > 0 && serials.length !== targetQty) {
                throw new product_service_1.AppError(`Số lượng serial (${serials.length}) không khớp với số lượng tồn (${targetQty})`, 400);
            }
            data.serialNumbers = serials;
        }
        const lot = await inventoryRepo.updateById(id, data);
        if (!lot)
            throw new product_service_1.AppError('Lô hàng không tồn tại', 404);
        return lot;
    }
    async delete(id) {
        return inventoryRepo.deleteById(id);
    }
}
exports.InventoryService = InventoryService;
//# sourceMappingURL=inventory.service.js.map