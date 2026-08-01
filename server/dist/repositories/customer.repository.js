"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerRepository = void 0;
const base_repository_1 = require("./base.repository");
const models_1 = require("../models");
const types_1 = require("../types");
class CustomerRepository extends base_repository_1.BaseRepository {
    constructor() {
        super(models_1.Customer);
    }
    async search(query) {
        const { page = 1, limit = 20, search, sort = 'createdAt', order = 'desc', customerType, hasDebtOnly = false, isOverdueOnly = false, } = query;
        const filter = {};
        if (customerType)
            filter.customerType = customerType;
        const isHasDebt = hasDebtOnly === true || String(hasDebtOnly) === 'true';
        if (isHasDebt)
            filter.totalDebt = { $gt: 0 };
        if (query.ownerId)
            filter.ownerId = query.ownerId;
        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i');
            filter.$or = [
                { customerCode: searchRegex },
                { name: searchRegex },
                { phone: searchRegex },
                { companyName: searchRegex },
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
    async findByPhone(phone, ownerId) {
        if (!phone || !phone.trim())
            return null;
        const filter = { phone: phone.trim() };
        if (ownerId)
            filter.ownerId = ownerId;
        return this.model.findOne(filter).exec();
    }
    async getStats(ownerId) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const filter = {};
        if (ownerId)
            filter.ownerId = ownerId;
        const [totalCustomers, newThisMonth, totalVip, totalEnterprise, customersWithDebt,] = await Promise.all([
            this.model.countDocuments(filter),
            this.model.countDocuments({ ...filter, createdAt: { $gte: startOfMonth } }),
            this.model.countDocuments({ ...filter, customerType: types_1.CustomerType.VIP }),
            this.model.countDocuments({ ...filter, customerType: types_1.CustomerType.ENTERPRISE }),
            this.model.countDocuments({ ...filter, totalDebt: { $gt: 0 } }),
        ]);
        return {
            totalCustomers,
            newThisMonth,
            totalVip,
            totalEnterprise,
            customersWithDebt,
            overdueCustomers: 0, // calculated via DebtService
        };
    }
}
exports.CustomerRepository = CustomerRepository;
//# sourceMappingURL=customer.repository.js.map