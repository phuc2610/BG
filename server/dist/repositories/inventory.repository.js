"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryRepository = void 0;
const base_repository_1 = require("./base.repository");
const models_1 = require("../models");
class InventoryRepository extends base_repository_1.BaseRepository {
    constructor() {
        super(models_1.Inventory);
    }
    async search(query) {
        const { page = 1, limit = 20, search, sort = 'createdAt', order = 'desc', condition, product, inStockOnly = false, statusFilter, } = query;
        const filter = {};
        if (condition)
            filter.condition = condition;
        if (product)
            filter.product = product;
        if (statusFilter === 'in_stock') {
            filter.isSold = { $ne: true };
            filter.quantity = { $gt: 0 };
        }
        else if (statusFilter === 'sold') {
            filter.isSold = true;
        }
        else if (inStockOnly) {
            filter.quantity = { $gt: 0 };
        }
        const skip = (page - 1) * limit;
        const sortOrder = order === 'asc' ? 1 : -1;
        const [items, total] = await Promise.all([
            this.model
                .find(filter)
                .populate('product')
                .sort({ [sort]: sortOrder })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            this.model.countDocuments(filter).exec(),
        ]);
        // JS filtering for populated fields & multi-criteria search
        let filteredItems = items;
        if (search && search.trim()) {
            const q = search.trim().toLowerCase();
            filteredItems = items.filter((item) => {
                const prodName = item.product?.name?.toLowerCase() || '';
                const prodCode = item.product?.productCode?.toLowerCase() || '';
                const stockCode = item.stockCode?.toLowerCase() || '';
                const sn = item.serialNumber?.toLowerCase() || '';
                const supplier = item.supplier?.toLowerCase() || '';
                const custName = item.soldToCustomer?.name?.toLowerCase() || '';
                const custPhone = item.soldToCustomer?.phone?.toLowerCase() || '';
                const quoteCode = item.soldQuoteCode?.toLowerCase() || '';
                return (prodName.includes(q) ||
                    prodCode.includes(q) ||
                    stockCode.includes(q) ||
                    sn.includes(q) ||
                    supplier.includes(q) ||
                    custName.includes(q) ||
                    custPhone.includes(q) ||
                    quoteCode.includes(q));
            });
        }
        const totalPages = Math.ceil(total / limit);
        return {
            data: filteredItems,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages,
            },
        };
    }
    async findByProduct(productId) {
        return this.model.find({ product: productId }).populate('product').exec();
    }
}
exports.InventoryRepository = InventoryRepository;
//# sourceMappingURL=inventory.repository.js.map