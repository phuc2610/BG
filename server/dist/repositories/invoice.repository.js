"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceRepository = void 0;
const base_repository_1 = require("./base.repository");
const models_1 = require("../models");
const types_1 = require("../types");
class InvoiceRepository extends base_repository_1.BaseRepository {
    constructor() {
        super(models_1.Invoice);
    }
    async search(query) {
        const { page = 1, limit = 20, search, sort = 'createdAt', order = 'desc', status, startDate, endDate, } = query;
        const filter = {};
        if (status)
            filter.status = status;
        if (query.ownerId)
            filter.ownerId = query.ownerId;
        if (startDate || endDate) {
            filter.createdDate = {};
            if (startDate)
                filter.createdDate.$gte = new Date(startDate);
            if (endDate)
                filter.createdDate.$lte = new Date(endDate);
        }
        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i');
            filter.$or = [
                { invoiceCode: searchRegex },
                { quoteCode: searchRegex },
                { 'customer.name': searchRegex },
                { 'customer.phone': searchRegex },
                { 'items.productSnapshot.name': searchRegex },
                { 'items.serialNumber': searchRegex },
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
        const filter = { status: { $ne: types_1.InvoiceStatus.CANCELLED } };
        if (ownerId)
            filter.ownerId = ownerId;
        const activeInvoices = await this.model.find(filter).exec();
        const totalInvoices = activeInvoices.length;
        let totalRevenue = 0;
        let totalPaid = 0;
        let totalReceivables = 0;
        for (const inv of activeInvoices) {
            totalRevenue += inv.grandTotal || 0;
            totalPaid += inv.totalPaid || 0;
            totalReceivables += inv.remainingAmount || 0;
        }
        const averageInvoiceValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;
        return {
            totalRevenue,
            totalPaid,
            totalReceivables,
            totalInvoices,
            averageInvoiceValue,
        };
    }
}
exports.InvoiceRepository = InvoiceRepository;
//# sourceMappingURL=invoice.repository.js.map