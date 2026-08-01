"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchaseRepository = void 0;
const base_repository_1 = require("./base.repository");
const models_1 = require("../models");
class PurchaseRepository extends base_repository_1.BaseRepository {
    constructor() {
        super(models_1.Purchase);
    }
    async search(query) {
        const { page = 1, limit = 20, search, sort = 'purchaseDate', order = 'desc', supplierId, status, startDate, endDate, } = query;
        const filter = {};
        if (supplierId)
            filter.supplierId = supplierId;
        if (status)
            filter.status = status;
        if (query.ownerId)
            filter.ownerId = query.ownerId;
        if (startDate || endDate) {
            filter.purchaseDate = {};
            if (startDate)
                filter.purchaseDate.$gte = new Date(startDate);
            if (endDate)
                filter.purchaseDate.$lte = new Date(endDate);
        }
        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i');
            filter.$or = [
                { purchaseCode: searchRegex },
                { 'supplier.name': searchRegex },
                { 'supplier.phone': searchRegex },
                { 'items.productName': searchRegex },
                { 'items.productCode': searchRegex },
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
}
exports.PurchaseRepository = PurchaseRepository;
//# sourceMappingURL=purchase.repository.js.map