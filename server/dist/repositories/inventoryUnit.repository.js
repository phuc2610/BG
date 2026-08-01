"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryUnitRepository = void 0;
const base_repository_1 = require("./base.repository");
const models_1 = require("../models");
class InventoryUnitRepository extends base_repository_1.BaseRepository {
    constructor() {
        super(models_1.InventoryUnit);
    }
    async search(query) {
        const { page = 1, limit = 50, search, sort = 'createdAt', order = 'desc', productId, supplierId, status, warrantyFilter = 'all', } = query;
        const filter = {};
        if (productId)
            filter.productId = productId;
        if (supplierId)
            filter.supplierId = supplierId;
        if (status)
            filter.status = status;
        if (query.ownerId)
            filter.ownerId = query.ownerId;
        const now = new Date();
        if (warrantyFilter === 'expired') {
            filter.supplierWarrantyEndDate = { $lte: now };
        }
        else if (warrantyFilter === 'due_soon') {
            const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            filter.supplierWarrantyEndDate = { $gt: now, $lte: in30Days };
        }
        else if (warrantyFilter === 'valid') {
            filter.supplierWarrantyEndDate = { $gt: now };
        }
        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i');
            filter.$or = [
                { serialNumber: searchRegex },
                { productCode: searchRegex },
                { productName: searchRegex },
                { supplierName: searchRegex },
                { purchaseCode: searchRegex },
            ];
        }
        const skip = (page - 1) * limit;
        const sortOrder = order === 'asc' ? 1 : -1;
        const [items, total] = await Promise.all([
            this.model
                .find(filter)
                .sort({ [sort]: sortOrder })
                .skip(skip)
                .limit(limit)
                .exec(),
            this.model.countDocuments(filter).exec(),
        ]);
        const totalPages = Math.ceil(total / limit);
        return {
            data: items,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages,
            },
        };
    }
    async findBySerial(serial) {
        if (!serial || !serial.trim())
            return null;
        return this.model.findOne({ serialNumber: serial.trim() }).exec();
    }
}
exports.InventoryUnitRepository = InventoryUnitRepository;
//# sourceMappingURL=inventoryUnit.repository.js.map