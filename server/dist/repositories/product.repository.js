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
        const { page = 1, limit = 20, search, sort = 'createdAt', order = 'desc', category, brand, noImage, } = query;
        const filter = {};
        if (search && search.trim()) {
            const trimmed = search.trim();
            const tokens = trimmed.split(/\s+/).filter(Boolean);
            const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (tokens.length > 1) {
                filter.$and = tokens.map((token) => {
                    const tokenRegex = new RegExp(escapeRegex(token), 'i');
                    return {
                        $or: [
                            { name: tokenRegex },
                            { productCode: tokenRegex },
                            { barcode: tokenRegex },
                            { brand: tokenRegex },
                            { modelName: tokenRegex },
                            { category: tokenRegex },
                            { 'specs.cpu': tokenRegex },
                            { 'specs.ram': tokenRegex },
                            { 'specs.ssd': tokenRegex },
                            { 'specs.vga': tokenRegex },
                        ],
                    };
                });
            }
            else {
                const searchRegex = new RegExp(escapeRegex(trimmed), 'i');
                filter.$or = [
                    { name: searchRegex },
                    { productCode: searchRegex },
                    { barcode: searchRegex },
                    { brand: searchRegex },
                    { modelName: searchRegex },
                    { category: searchRegex },
                    { 'specs.cpu': searchRegex },
                    { 'specs.ram': searchRegex },
                    { 'specs.ssd': searchRegex },
                    { 'specs.vga': searchRegex },
                ];
            }
        }
        if (category)
            filter.category = category;
        if (brand)
            filter.brand = new RegExp(brand, 'i');
        if (noImage)
            filter.images = { $size: 0 };
        return this.findPaginated(filter, page, limit, sort, order);
    }
    async getStats() {
        const [totalProducts, totalInventoryItems, stockAgg, categoryStats, conditionStats, financialStats,] = await Promise.all([
            this.model.countDocuments({}),
            models_1.Inventory.countDocuments({}),
            models_1.Inventory.aggregate([{ $group: { _id: null, totalQty: { $sum: '$quantity' } } }]),
            this.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
            models_1.Inventory.aggregate([{ $group: { _id: '$condition', count: { $sum: 1 } } }]),
            models_1.Quote.aggregate([
                { $match: { status: types_1.QuoteStatus.CONFIRMED } },
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
    async getBrands() {
        return this.model.distinct('brand', {}).exec();
    }
}
exports.ProductRepository = ProductRepository;
//# sourceMappingURL=product.repository.js.map