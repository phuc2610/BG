"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductRepository = void 0;
const base_repository_1 = require("./base.repository");
const models_1 = require("../models");
const types_1 = require("../types");
class ProductRepository extends base_repository_1.BaseRepository {
    constructor() {
        super(models_1.Product);
    }
    async search(query) {
        const { page = 1, limit = 20, search, sort = 'createdAt', order = 'desc', category, brand, } = query;
        const filter = {};
        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i');
            filter.$or = [
                { name: searchRegex },
                { productCode: searchRegex },
                { barcode: searchRegex },
                { brand: searchRegex },
                { modelName: searchRegex },
                { 'specs.cpu': searchRegex },
                { 'specs.ram': searchRegex },
                { 'specs.ssd': searchRegex },
                { 'specs.vga': searchRegex },
            ];
        }
        if (category)
            filter.category = category;
        if (brand)
            filter.brand = new RegExp(brand, 'i');
        if (query.ownerId)
            filter.ownerId = query.ownerId;
        return this.findPaginated(filter, page, limit, sort, order);
    }
    async getStats(ownerId) {
        const filter = {};
        if (ownerId)
            filter.ownerId = ownerId;
        const matchStage = ownerId ? [{ $match: { ownerId } }] : [];
        const quoteMatchStage = ownerId ? [{ $match: { status: types_1.QuoteStatus.CONFIRMED, ownerId } }] : [{ $match: { status: types_1.QuoteStatus.CONFIRMED } }];
        const [totalProducts, totalInventoryItems, stockAgg, categoryStats, conditionStats, financialStats,] = await Promise.all([
            this.model.countDocuments(filter),
            models_1.Inventory.countDocuments(filter),
            models_1.Inventory.aggregate([...matchStage, { $group: { _id: null, totalQty: { $sum: '$quantity' } } }]),
            this.aggregate([...matchStage, { $group: { _id: '$category', count: { $sum: 1 } } }]),
            models_1.Inventory.aggregate([...matchStage, { $group: { _id: '$condition', count: { $sum: 1 } } }]),
            models_1.Quote.aggregate([
                ...quoteMatchStage,
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$grandTotal' },
                        totalCost: { $sum: '$totalCost' },
                        totalProfit: { $sum: '$profit' },
                    },
                },
            ]),
        ]);
        const byCategory = {};
        categoryStats.forEach((stat) => {
            byCategory[stat._id] = stat.count;
        });
        const byCondition = {};
        conditionStats.forEach((stat) => {
            byCondition[stat._id] = stat.count;
        });
        const revenue = financialStats[0]?.totalRevenue || 0;
        const cost = financialStats[0]?.totalCost || 0;
        const profit = financialStats[0]?.totalProfit || (revenue - cost);
        const totalStockQuantity = stockAgg[0]?.totalQty || 0;
        return {
            totalProducts,
            totalInventoryItems,
            totalStockQuantity,
            totalRevenue: revenue,
            totalCost: cost,
            totalProfit: profit,
            byCategory,
            byCondition,
        };
    }
    async getBrands(ownerId) {
        const filter = {};
        if (ownerId)
            filter.ownerId = ownerId;
        return this.model.distinct('brand', filter).exec();
    }
}
exports.ProductRepository = ProductRepository;
//# sourceMappingURL=product.repository.js.map