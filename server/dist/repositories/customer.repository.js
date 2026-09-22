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
        const { page = 1, limit = 20, search, sort = 'createdAt', order = 'desc', customerType, hasDebtOnly = false, } = query;
        const filter = {};
        if (customerType)
            filter.customerType = customerType;
        const isHasDebt = hasDebtOnly === true || String(hasDebtOnly) === 'true';
        if (isHasDebt)
            filter.totalDebt = { $gt: 0 };
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
    async findByPhone(phone) {
        if (!phone || !phone.trim())
            return null;
        return this.model.findOne({ phone: phone.trim() }).exec();
    }
    async getStats() {
        const totalCustomers = await this.model.countDocuments({}).exec();
        const invoices = await models_1.Invoice.find({ status: { $ne: types_1.InvoiceStatus.CANCELLED } }).exec();
        let totalRevenue = 0;
        let totalPaid = 0;
        let totalDebt = 0;
        let totalProfit = 0;
        for (const inv of invoices) {
            totalRevenue += inv.grandTotal || 0;
            totalPaid += inv.totalPaid || 0;
            totalDebt += inv.remainingAmount || 0;
            totalProfit += (inv.profit !== undefined ? inv.profit : ((inv.grandTotal || 0) - (inv.vatAmount || 0) - (inv.shippingFee || 0) - (inv.totalCost || 0)));
        }
        return {
            totalCustomers,
            totalRevenue,
            totalPaid,
            totalDebt,
            totalProfit,
        };
    }
}
exports.CustomerRepository = CustomerRepository;
//# sourceMappingURL=customer.repository.js.map