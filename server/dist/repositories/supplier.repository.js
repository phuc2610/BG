"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierRepository = void 0;
const base_repository_1 = require("./base.repository");
const models_1 = require("../models");
class SupplierRepository extends base_repository_1.BaseRepository {
    constructor() {
        super(models_1.Supplier);
    }
    async search(query) {
        const { page = 1, limit = 20, search, sort = 'createdAt', order = 'desc', status, hasDebtOnly = false, } = query;
        const filter = {};
        if (status)
            filter.status = status;
        const isHasDebtOnly = hasDebtOnly === true || String(hasDebtOnly) === 'true';
        if (isHasDebtOnly)
            filter.totalDebt = { $gt: 0 };
        if (query.ownerId)
            filter.ownerId = query.ownerId;
        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i');
            filter.$or = [
                { supplierCode: searchRegex },
                { name: searchRegex },
                { companyName: searchRegex },
                { phone: searchRegex },
                { email: searchRegex },
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
    async getStats(ownerId) {
        const filter = {};
        if (ownerId)
            filter.ownerId = ownerId;
        const suppliers = await this.model.find(filter).exec();
        let totalPurchased = 0;
        let totalPaid = 0;
        let totalDebt = 0;
        for (const s of suppliers) {
            totalPurchased += s.totalPurchased || 0;
            totalPaid += s.totalPaid || 0;
            totalDebt += s.totalDebt || 0;
        }
        return {
            totalSuppliers: suppliers.length,
            totalPurchased,
            totalPaid,
            totalDebt,
            overdueDebt: 0,
        };
    }
}
exports.SupplierRepository = SupplierRepository;
//# sourceMappingURL=supplier.repository.js.map