"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryUnitService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const repositories_1 = require("../repositories");
const models_1 = require("../models");
const types_1 = require("../types");
const product_service_1 = require("./product.service");
const unitRepo = new repositories_1.InventoryUnitRepository();
const productRepo = new repositories_1.ProductRepository();
class InventoryUnitService {
    async getAll(query) {
        return unitRepo.search(query);
    }
    async getById(id) {
        const unit = await unitRepo.findById(id);
        if (!unit)
            throw new product_service_1.AppError('Linh kiện / Serial không tồn tại trong hệ thống', 404);
        return unit;
    }
    /**
     * Aggregates physical inventory grouped by PRODUCT (Master Catalog item).
     * Calculates Available stock count, Reserved count, Sold count, and Stock Value at purchase price.
     */
    async getGroupedInventory(query) {
        const filter = {};
        if (query.category)
            filter.category = query.category;
        if (query.ownerId)
            filter.ownerId = query.ownerId;
        if (query.search && query.search.trim()) {
            const searchRegex = new RegExp(query.search.trim(), 'i');
            filter.$or = [
                { productCode: searchRegex },
                { name: searchRegex },
                { brand: searchRegex },
                { modelName: searchRegex },
            ];
        }
        const products = await models_1.Product.find(filter).sort({ name: 1 }).exec();
        const now = new Date();
        const result = await Promise.all(products.map(async (product) => {
            const unitFilter = { productId: product._id };
            if (query.ownerId)
                unitFilter.ownerId = query.ownerId;
            const units = await models_1.InventoryUnit.find(unitFilter).exec();
            const availableUnits = units.filter((u) => u.status === types_1.InventoryUnitStatus.AVAILABLE);
            const reservedUnits = units.filter((u) => u.status === types_1.InventoryUnitStatus.RESERVED);
            const soldUnits = units.filter((u) => u.status === types_1.InventoryUnitStatus.SOLD);
            // Valuation of in-stock items at actual purchase cost
            const inStockUnits = units.filter((u) => u.status === types_1.InventoryUnitStatus.AVAILABLE || u.status === types_1.InventoryUnitStatus.RESERVED);
            const totalStockValue = inStockUnits.reduce((sum, u) => sum + (u.purchasePrice || 0), 0);
            // Latest purchase price
            const sortedByDate = [...units].sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
            const latestCostPrice = sortedByDate.length > 0 ? sortedByDate[0].purchasePrice : 0;
            return {
                productId: product._id,
                productCode: product.productCode,
                productName: product.name,
                category: product.category,
                brand: product.brand,
                imageUrl: product.thumbnailUrl || (product.images && product.images.length > 0 ? product.images[0].url : null),
                availableStock: availableUnits.length,
                reservedStock: reservedUnits.length,
                soldStock: soldUnits.length,
                totalStock: availableUnits.length + reservedUnits.length,
                latestCostPrice,
                totalStockValue,
            };
        }));
        return result;
    }
    /**
     * Aggregates physical inventory grouped by PRODUCT and CONDITION.
     * Allows quoting exact product variants by condition (New, Like New, 99%...) with precise stock counts per condition.
     */
    async getGroupedInventoryByCondition(query) {
        const filter = {};
        if (query.ownerId)
            filter.ownerId = query.ownerId;
        if (query.search && query.search.trim()) {
            const searchRegex = new RegExp(query.search.trim(), 'i');
            filter.$or = [
                { productCode: searchRegex },
                { name: searchRegex },
                { brand: searchRegex },
            ];
        }
        const products = await models_1.Product.find(filter).sort({ name: 1 }).exec();
        const resultVariants = [];
        for (const product of products) {
            const unitFilter = { productId: product._id };
            if (query.ownerId)
                unitFilter.ownerId = query.ownerId;
            const units = await models_1.InventoryUnit.find(unitFilter).exec();
            const p = product;
            if (units.length === 0) {
                resultVariants.push({
                    productId: product._id,
                    productCode: product.productCode,
                    productName: product.name,
                    category: product.category,
                    condition: p.condition || 'New',
                    availableStock: 0,
                    reservedStock: 0,
                    costPrice: 0,
                    suggestedSellingPrice: p.sellingPrice || 0,
                    imageUrl: p.thumbnailUrl || (product.images && product.images.length > 0 ? product.images[0].url : null),
                    specs: product.specs,
                });
            }
            else {
                const conditionMap = {};
                for (const u of units) {
                    const cond = u.condition || 'New';
                    if (!conditionMap[cond])
                        conditionMap[cond] = [];
                    conditionMap[cond].push(u);
                }
                for (const [cond, condUnits] of Object.entries(conditionMap)) {
                    const availableUnits = condUnits.filter((u) => u.status === types_1.InventoryUnitStatus.AVAILABLE);
                    const reservedUnits = condUnits.filter((u) => u.status === types_1.InventoryUnitStatus.RESERVED);
                    const sortedByDate = [...condUnits].sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
                    const latestCostPrice = sortedByDate.length > 0 ? sortedByDate[0].purchasePrice : 0;
                    resultVariants.push({
                        productId: product._id,
                        productCode: product.productCode,
                        productName: product.name,
                        category: product.category,
                        condition: cond,
                        availableStock: availableUnits.length,
                        reservedStock: reservedUnits.length,
                        costPrice: latestCostPrice,
                        suggestedSellingPrice: p.sellingPrice || (latestCostPrice ? Math.round((latestCostPrice * 1.25) / 10000) * 10000 : 0),
                        imageUrl: p.thumbnailUrl || (product.images && product.images.length > 0 ? product.images[0].url : null),
                        specs: product.specs,
                    });
                }
            }
        }
        return resultVariants;
    }
    /**
     * Returns individual physical serial units for a specific Product with calculated warranty days.
     */
    async getUnitsByProduct(productId, ownerId) {
        if (!productId || productId === 'undefined')
            return [];
        let filter = { productId };
        if (ownerId)
            filter.ownerId = ownerId;
        if (!mongoose_1.default.Types.ObjectId.isValid(productId)) {
            const pFilter = { productCode: productId };
            if (ownerId)
                pFilter.ownerId = ownerId;
            const p = await models_1.Product.findOne(pFilter);
            if (p) {
                filter = { productId: p._id };
                if (ownerId)
                    filter.ownerId = ownerId;
            }
            else {
                filter = { productCode: productId };
                if (ownerId)
                    filter.ownerId = ownerId;
            }
        }
        const units = await models_1.InventoryUnit.find(filter).sort({ purchaseDate: -1 }).exec();
        const now = new Date();
        return units.map((u) => {
            const endDate = new Date(u.supplierWarrantyEndDate);
            const diffTime = endDate.getTime() - now.getTime();
            const remainingDays = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;
            let warrantyStatus = 'NORMAL';
            if (remainingDays <= 0) {
                warrantyStatus = 'EXPIRED';
            }
            else if (remainingDays <= 30) {
                warrantyStatus = 'DUE_SOON';
            }
            return {
                ...u.toObject(),
                remainingWarrantyDays: remainingDays,
                warrantyStatus,
            };
        });
    }
    /**
     * Updates condition of a specific serial unit.
     */
    async updateUnitCondition(unitId, condition) {
        const unit = await this.getById(unitId);
        unit.condition = condition;
        await unit.save();
        return unit;
    }
}
exports.InventoryUnitService = InventoryUnitService;
//# sourceMappingURL=inventoryUnit.service.js.map