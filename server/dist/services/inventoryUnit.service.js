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
    async updateListPrice(id, listPrice) {
        const unit = await models_1.InventoryUnit.findById(id);
        if (!unit)
            throw new product_service_1.AppError('Sản phẩm / Serial không tồn tại', 404);
        const val = Math.max(0, Number(listPrice) || 0);
        unit.listPrice = val;
        await unit.save();
        if (unit.productId) {
            await models_1.Product.findByIdAndUpdate(unit.productId, { sellingPrice: val });
        }
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
        const result = await Promise.all(products.map(async (product) => {
            const units = await models_1.InventoryUnit.find({ productId: product._id }).exec();
            const availableUnits = units.filter((u) => u.status === types_1.InventoryUnitStatus.AVAILABLE);
            const reservedUnits = units.filter((u) => u.status === types_1.InventoryUnitStatus.RESERVED);
            const soldUnits = units.filter((u) => u.status === types_1.InventoryUnitStatus.SOLD);
            // Valuation of in-stock items at actual purchase cost and list price
            const inStockUnits = units.filter((u) => u.status === types_1.InventoryUnitStatus.AVAILABLE || u.status === types_1.InventoryUnitStatus.RESERVED);
            const totalStockValue = inStockUnits.reduce((sum, u) => sum + (u.purchasePrice || 0), 0);
            // Latest purchase unit for price info
            const activeUnitsList = inStockUnits.length > 0 ? inStockUnits : units;
            const sortedByDate = [...activeUnitsList].sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
            const latestUnit = sortedByDate.length > 0 ? sortedByDate[0] : null;
            const latestCostPrice = latestUnit ? latestUnit.purchasePrice : 0;
            const latestListPrice = (latestUnit && latestUnit.listPrice && latestUnit.listPrice > 0)
                ? latestUnit.listPrice
                : (product.sellingPrice && product.sellingPrice > 0)
                    ? product.sellingPrice
                    : latestCostPrice;
            const totalStockListValue = inStockUnits.reduce((sum, u) => sum + (u.listPrice || product.sellingPrice || u.purchasePrice || 0), 0);
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
                latestListPrice,
                totalStockValue,
                totalStockListValue,
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
            const units = await models_1.InventoryUnit.find({ productId: product._id }).exec();
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
                    listPrice: p.sellingPrice || 0,
                    suggestedSellingPrice: p.sellingPrice || 0,
                    imageUrl: p.thumbnailUrl || (product.images && product.images.length > 0 ? product.images[0].url : null),
                    specs: product.specs,
                });
            }
            else {
                const byConditionMap = {};
                for (const u of units) {
                    const cond = u.condition || 'New';
                    if (!byConditionMap[cond])
                        byConditionMap[cond] = [];
                    byConditionMap[cond].push(u);
                }
                for (const [cond, condUnits] of Object.entries(byConditionMap)) {
                    const avail = condUnits.filter((u) => u.status === types_1.InventoryUnitStatus.AVAILABLE).length;
                    const res = condUnits.filter((u) => u.status === types_1.InventoryUnitStatus.RESERVED).length;
                    const inStockCondUnits = condUnits.filter((u) => u.status === types_1.InventoryUnitStatus.AVAILABLE || u.status === types_1.InventoryUnitStatus.RESERVED);
                    const sortedByDate = [...inStockCondUnits.length > 0 ? inStockCondUnits : condUnits].sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
                    const latestUnit = sortedByDate.length > 0 ? sortedByDate[0] : null;
                    const latestCostPrice = latestUnit ? latestUnit.purchasePrice : 0;
                    const latestListPrice = (latestUnit && latestUnit.listPrice && latestUnit.listPrice > 0)
                        ? latestUnit.listPrice
                        : (p.sellingPrice && p.sellingPrice > 0)
                            ? p.sellingPrice
                            : latestCostPrice;
                    resultVariants.push({
                        productId: product._id,
                        productCode: product.productCode,
                        productName: product.name,
                        category: product.category,
                        condition: cond,
                        availableStock: avail,
                        reservedStock: res,
                        costPrice: latestCostPrice,
                        listPrice: latestListPrice,
                        suggestedSellingPrice: latestListPrice,
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
    async getUnitsByProduct(productId) {
        if (!productId || productId === 'undefined')
            return [];
        let filter = { productId };
        if (!mongoose_1.default.Types.ObjectId.isValid(productId)) {
            const p = await models_1.Product.findOne({ productCode: productId });
            if (p) {
                filter = { productId: p._id };
            }
            else {
                filter = { productCode: productId };
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