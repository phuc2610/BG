import mongoose from 'mongoose';
import { InventoryUnitRepository, ProductRepository } from '../repositories';
import { InventoryUnit, IInventoryUnitDocument, Product } from '../models';
import { InventoryUnitStatus, InventoryUnitFilterQuery, ProductCategory } from '../types';
import { AppError } from './product.service';

const unitRepo = new InventoryUnitRepository();
const productRepo = new ProductRepository();

export class InventoryUnitService {
  async getAll(query: InventoryUnitFilterQuery) {
    return unitRepo.search(query);
  }

  async getById(id: string) {
    const unit = await unitRepo.findById(id);
    if (!unit) throw new AppError('Linh kiện / Serial không tồn tại trong hệ thống', 404);
    return unit;
  }

  /**
   * Aggregates physical inventory grouped by PRODUCT (Master Catalog item).
   * Calculates Available stock count, Reserved count, Sold count, and Stock Value at purchase price.
   */
  async getGroupedInventory(query: {
    category?: ProductCategory;
    search?: string;
    warrantyStatus?: string;
  }) {
    const filter: any = {};
    if (query.category) filter.category = query.category;

    if (query.search && query.search.trim()) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { productCode: searchRegex },
        { name: searchRegex },
        { brand: searchRegex },
        { modelName: searchRegex },
      ];
    }

    const products = await Product.find(filter).sort({ name: 1 }).exec();

    const result = await Promise.all(
      products.map(async (product) => {
        const units = await InventoryUnit.find({ productId: product._id }).exec();

        const availableUnits = units.filter((u) => u.status === InventoryUnitStatus.AVAILABLE);
        const reservedUnits = units.filter((u) => u.status === InventoryUnitStatus.RESERVED);
        const soldUnits = units.filter((u) => u.status === InventoryUnitStatus.SOLD);

        // Valuation of in-stock items at actual purchase cost
        const inStockUnits = units.filter(
          (u) => u.status === InventoryUnitStatus.AVAILABLE || u.status === InventoryUnitStatus.RESERVED
        );
        const totalStockValue = inStockUnits.reduce((sum, u) => sum + (u.purchasePrice || 0), 0);

        // Latest purchase price
        const sortedByDate = [...units].sort(
          (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
        );
        const latestCostPrice = sortedByDate.length > 0 ? sortedByDate[0].purchasePrice : 0;

        return {
          productId: product._id,
          productCode: product.productCode,
          productName: product.name,
          category: product.category,
          brand: product.brand,
          imageUrl: (product as any).thumbnailUrl || (product.images && product.images.length > 0 ? product.images[0].url : null),
          availableStock: availableUnits.length,
          reservedStock: reservedUnits.length,
          soldStock: soldUnits.length,
          totalStock: availableUnits.length + reservedUnits.length,
          latestCostPrice,
          totalStockValue,
        };
      })
    );

    return result;
  }

  /**
   * Aggregates physical inventory grouped by PRODUCT and CONDITION.
   * Allows quoting exact product variants by condition (New, Like New, 99%...) with precise stock counts per condition.
   */
  async getGroupedInventoryByCondition(query: { search?: string }) {
    const filter: any = {};
    if (query.search && query.search.trim()) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { productCode: searchRegex },
        { name: searchRegex },
        { brand: searchRegex },
      ];
    }

    const products = await Product.find(filter).sort({ name: 1 }).exec();
    const resultVariants: any[] = [];

    for (const product of products) {
      const units = await InventoryUnit.find({ productId: product._id }).exec();
      const p = product as any;

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
      } else {
        const byConditionMap: Record<string, typeof units> = {};
        for (const u of units) {
          const cond = u.condition || 'New';
          if (!byConditionMap[cond]) byConditionMap[cond] = [];
          byConditionMap[cond].push(u);
        }

        for (const [cond, condUnits] of Object.entries(byConditionMap)) {
          const avail = condUnits.filter((u) => u.status === InventoryUnitStatus.AVAILABLE).length;
          const res = condUnits.filter((u) => u.status === InventoryUnitStatus.RESERVED).length;

          const sortedByDate = [...condUnits].sort(
            (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
          );
          const latestCostPrice = sortedByDate.length > 0 ? sortedByDate[0].purchasePrice : 0;

          resultVariants.push({
            productId: product._id,
            productCode: product.productCode,
            productName: product.name,
            category: product.category,
            condition: cond,
            availableStock: avail,
            reservedStock: res,
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
  async getUnitsByProduct(productId: string) {
    if (!productId || productId === 'undefined') return [];

    let filter: any = { productId };

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      const p = await Product.findOne({ productCode: productId });
      if (p) {
        filter = { productId: p._id };
      } else {
        filter = { productCode: productId };
      }
    }

    const units = await InventoryUnit.find(filter).sort({ purchaseDate: -1 }).exec();
    const now = new Date();

    return units.map((u) => {
      const endDate = new Date(u.supplierWarrantyEndDate);
      const diffTime = endDate.getTime() - now.getTime();
      const remainingDays = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;

      let warrantyStatus: 'NORMAL' | 'DUE_SOON' | 'EXPIRED' = 'NORMAL';
      if (remainingDays <= 0) {
        warrantyStatus = 'EXPIRED';
      } else if (remainingDays <= 30) {
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
  async updateUnitCondition(unitId: string, condition: any) {
    const unit = await this.getById(unitId);
    unit.condition = condition;
    await unit.save();
    return unit;
  }
}
