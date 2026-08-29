import mongoose from 'mongoose';
import { InventoryUnitRepository, ProductRepository } from '../repositories';
import { InventoryUnit, IInventoryUnitDocument, Product, Invoice } from '../models';
import { InventoryUnitStatus, InventoryUnitFilterQuery, ProductCategory, ProductCondition } from '../types';
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

  async updateListPrice(id: string, listPrice: number) {
    const unit = await InventoryUnit.findById(id);
    if (!unit) throw new AppError('Sản phẩm / Serial không tồn tại', 404);
    const val = Math.max(0, Number(listPrice) || 0);
    unit.listPrice = val;
    await unit.save();

    if (unit.productId) {
      await Product.findByIdAndUpdate(unit.productId, { sellingPrice: val });
    }
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
    inStockOnly?: string;
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

    const products = await Product.find(filter).sort({ name: 1 }).lean().exec();
    if (products.length === 0) return [];

    const productIds = products.map((p) => p._id);
    const allUnits = await InventoryUnit.find({ productId: { $in: productIds } }).lean().exec();

    // Group units by productId
    const unitsByProductMap = new Map<string, any[]>();
    for (const u of allUnits) {
      const pidStr = u.productId.toString();
      if (!unitsByProductMap.has(pidStr)) {
        unitsByProductMap.set(pidStr, []);
      }
      unitsByProductMap.get(pidStr)!.push(u);
    }

    const result = products.map((product) => {
      const p = product as any;
      const pidStr = p._id.toString();
      const units = unitsByProductMap.get(pidStr) || [];

      const availableUnits = units.filter((u) => u.status === InventoryUnitStatus.AVAILABLE);
      const reservedUnits = units.filter((u) => u.status === InventoryUnitStatus.RESERVED);
      const soldUnits = units.filter((u) => u.status === InventoryUnitStatus.SOLD);

      // Valuation of in-stock items at actual purchase cost and list price
      const inStockUnits = units.filter(
        (u) => u.status === InventoryUnitStatus.AVAILABLE || u.status === InventoryUnitStatus.RESERVED
      );
      const totalStockValue = inStockUnits.reduce((sum, u) => sum + (u.purchasePrice || 0), 0);

      // Latest purchase unit for price info
      const activeUnitsList = inStockUnits.length > 0 ? inStockUnits : units;
      const sortedByDate = [...activeUnitsList].sort(
        (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
      );
      const latestUnit = sortedByDate.length > 0 ? sortedByDate[0] : null;
      const latestCostPrice = latestUnit ? (latestUnit.purchasePrice || 0) : 0;
      const latestListPrice = (latestUnit && latestUnit.listPrice && latestUnit.listPrice > 0)
        ? latestUnit.listPrice
        : (p.sellingPrice && p.sellingPrice > 0)
        ? p.sellingPrice
        : latestCostPrice;

      const totalStockListValue = inStockUnits.reduce(
        (sum, u) => sum + (u.listPrice || p.sellingPrice || u.purchasePrice || 0),
        0
      );

      const thumbUrl =
        p.thumbnailUrl ||
        (p.images && p.images.length > 0
          ? (p.images.find((img: any) => img.isThumbnail) || p.images[0])?.url
          : null);

      return {
        productId: p._id,
        productCode: p.productCode,
        productName: p.name,
        category: p.category,
        brand: p.brand,
        imageUrl: thumbUrl,
        availableStock: availableUnits.length,
        reservedStock: reservedUnits.length,
        soldStock: soldUnits.length,
        totalStock: availableUnits.length + reservedUnits.length,
        latestCostPrice,
        latestListPrice,
        totalStockValue,
        totalStockListValue,
      };
    });

    // Filter out zero-stock products when inStockOnly is enabled
    if (query.inStockOnly === 'true' || query.inStockOnly === '1') {
      return result.filter((p) => p.availableStock > 0 || p.reservedStock > 0);
    }

    return result;
  }

  /**
   * Returns flat array of all in-stock InventoryUnits with product info for Excel export.
   */
  async getExportData(query: {
    category?: ProductCategory;
    search?: string;
    inStockOnly?: string;
  }) {
    // Build unit filter
    const unitFilter: any = {};

    // Default: only in-stock units (AVAILABLE + RESERVED)
    if (query.inStockOnly === 'true' || query.inStockOnly === '1' || !query.inStockOnly) {
      unitFilter.status = { $in: [InventoryUnitStatus.AVAILABLE, InventoryUnitStatus.RESERVED] };
    }

    // If category filter, first find matching product IDs
    let productIdFilter: any = {};
    if (query.category) {
      productIdFilter.category = query.category;
    }
    if (query.search && query.search.trim()) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      productIdFilter.$or = [
        { productCode: searchRegex },
        { name: searchRegex },
        { brand: searchRegex },
        { modelName: searchRegex },
      ];
    }

    // Get matching products
    const products = await Product.find(productIdFilter).exec();
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));
    const productIds = products.map((p) => p._id);

    if (productIds.length > 0) {
      unitFilter.productId = { $in: productIds };
    } else if (Object.keys(productIdFilter).length > 0) {
      // Search/category specified but no products match
      return [];
    }

    const units = await InventoryUnit.find(unitFilter)
      .sort({ productName: 1, serialNumber: 1 })
      .exec();

    const now = new Date();

    return units.map((u) => {
      const product = productMap.get(u.productId.toString());
      const endDate = new Date(u.supplierWarrantyEndDate);
      const diffTime = endDate.getTime() - now.getTime();
      const remainingDays = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;

      let warrantyStatusLabel = 'Còn BH';
      if (remainingDays <= 0) {
        warrantyStatusLabel = 'Hết BH';
      } else if (remainingDays <= 30) {
        warrantyStatusLabel = 'Sắp hết BH';
      }

      const statusLabel = u.status === InventoryUnitStatus.AVAILABLE
        ? 'Còn hàng'
        : u.status === InventoryUnitStatus.RESERVED
        ? 'Đã đặt cọc'
        : u.status === InventoryUnitStatus.SOLD
        ? 'Đã bán'
        : u.status === InventoryUnitStatus.DAMAGED
        ? 'Lỗi kho'
        : u.status === InventoryUnitStatus.WARRANTY
        ? 'Bảo hành'
        : u.status;

      return {
        unitId: u._id,
        productId: u.productId,
        productCode: u.productCode,
        productName: u.productName,
        category: product?.category || u.productName,
        brand: product?.brand || '',
        condition: u.condition,
        serialNumber: u.serialNumber || 'Không có serial',
        supplierName: u.supplierName || 'Không có',
        purchaseCode: u.purchaseCode || '',
        purchaseDate: u.purchaseDate,
        purchasePrice: u.purchasePrice,
        listPrice: u.listPrice || (product as any)?.sellingPrice || u.purchasePrice,
        supplierWarrantyMonths: u.supplierWarrantyMonths,
        supplierWarrantyEndDate: u.supplierWarrantyEndDate,
        warrantyStatusLabel,
        remainingDays,
        status: u.status,
        statusLabel,
      };
    });
  }

  /**
   * Fast grouped inventory by condition for Quotes & Invoices.
   * Uses single batch query to eliminate N+1 latency.
   */
  async getGroupedInventoryByCondition(query: { search?: string }) {
    const filter: any = {};

    if (query.search && query.search.trim()) {
      const term = query.search.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const searchRegex = new RegExp(term, 'i');

      // Also search matching serial units
      const serialUnits = await InventoryUnit.find({ serialNumber: searchRegex })
        .select('productId')
        .lean()
        .exec();
      const serialProductIds = serialUnits.map((u) => u.productId);

      filter.$or = [
        { productCode: searchRegex },
        { name: searchRegex },
        { brand: searchRegex },
        { modelName: searchRegex },
        ...(serialProductIds.length > 0 ? [{ _id: { $in: serialProductIds } }] : []),
      ];
    }

    const products = await Product.find(filter).sort({ name: 1 }).lean().exec();
    if (products.length === 0) return [];

    const productIds = products.map((p) => p._id);
    const allUnits = await InventoryUnit.find({ productId: { $in: productIds } }).lean().exec();

    // Group units by productId
    const unitsByProductMap = new Map<string, any[]>();
    for (const u of allUnits) {
      const pidStr = u.productId.toString();
      if (!unitsByProductMap.has(pidStr)) {
        unitsByProductMap.set(pidStr, []);
      }
      unitsByProductMap.get(pidStr)!.push(u);
    }

    const resultVariants: any[] = [];

    for (const product of products) {
      const p = product as any;
      const pidStr = p._id.toString();
      const units = unitsByProductMap.get(pidStr) || [];

      const thumbUrl =
        p.thumbnailUrl ||
        (p.images && p.images.length > 0
          ? (p.images.find((img: any) => img.isThumbnail) || p.images[0])?.url
          : null);

      if (units.length === 0) {
        resultVariants.push({
          productId: p._id,
          productCode: p.productCode,
          productName: p.name,
          category: p.category,
          condition: p.condition || 'New',
          availableStock: 0,
          reservedStock: 0,
          costPrice: 0,
          listPrice: p.sellingPrice || 0,
          suggestedSellingPrice: p.sellingPrice || 0,
          imageUrl: thumbUrl,
          specs: p.specs,
        });
      } else {
        const byConditionMap: Record<string, any[]> = {};
        for (const u of units) {
          const cond = u.condition || 'New';
          if (!byConditionMap[cond]) byConditionMap[cond] = [];
          byConditionMap[cond].push(u);
        }

        for (const [cond, condUnits] of Object.entries(byConditionMap)) {
          const avail = condUnits.filter((u) => u.status === InventoryUnitStatus.AVAILABLE).length;
          const res = condUnits.filter((u) => u.status === InventoryUnitStatus.RESERVED).length;

          const inStockCondUnits = condUnits.filter(
            (u) => u.status === InventoryUnitStatus.AVAILABLE || u.status === InventoryUnitStatus.RESERVED
          );
          const sortedByDate = [...(inStockCondUnits.length > 0 ? inStockCondUnits : condUnits)].sort(
            (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
          );
          const latestUnit = sortedByDate.length > 0 ? sortedByDate[0] : null;
          const latestCostPrice = latestUnit ? (latestUnit.purchasePrice || 0) : 0;
          const latestListPrice =
            latestUnit && latestUnit.listPrice && latestUnit.listPrice > 0
              ? latestUnit.listPrice
              : p.sellingPrice && p.sellingPrice > 0
              ? p.sellingPrice
              : latestCostPrice;

          resultVariants.push({
            productId: p._id,
            productCode: p.productCode,
            productName: p.name,
            category: p.category,
            condition: cond,
            availableStock: avail,
            reservedStock: res,
            costPrice: latestCostPrice,
            listPrice: latestListPrice,
            suggestedSellingPrice: latestListPrice,
            imageUrl: thumbUrl,
            specs: p.specs,
          });
        }
      }
    }

    return resultVariants;
  }

  /**
   * Returns individual physical serial units for a specific Product with calculated warranty days
   * and buyer customer info if the unit was sold or reserved.
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

    // Fetch related invoices to extract buyer / customer info
    const invoiceIds = Array.from(
      new Set(
        [
          ...units.map((u) => u.soldInvoiceId?.toString()),
          ...units.map((u) => u.reservedByInvoiceId?.toString()),
        ].filter(Boolean)
      )
    );

    const invoices =
      invoiceIds.length > 0
        ? await Invoice.find({ _id: { $in: invoiceIds } })
            .select('invoiceCode customerId customer createdDate status isFinalized')
            .lean()
            .exec()
        : [];

    const invoiceMap = new Map((invoices as any[]).map((inv) => [inv._id.toString(), inv]));

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

      const relInvoiceId = u.soldInvoiceId?.toString() || u.reservedByInvoiceId?.toString();
      const inv = relInvoiceId ? invoiceMap.get(relInvoiceId) : null;

      const customerInfo = inv
        ? {
            customerId: inv.customerId ? inv.customerId.toString() : undefined,
            customerName: inv.customer?.name || 'Khách lẻ',
            customerPhone: inv.customer?.phone || '',
            customerEmail: inv.customer?.email || '',
            customerAddress: inv.customer?.address || '',
            invoiceId: inv._id ? inv._id.toString() : undefined,
            invoiceCode: inv.invoiceCode,
            soldAt: u.soldAt || inv.createdDate,
            isFinalized: inv.isFinalized,
          }
        : null;

      return {
        ...u.toObject(),
        remainingWarrantyDays: remainingDays,
        warrantyStatus,
        customerInfo,
      };
    });
  }

  /**
   * Returns units matching a list of serial numbers with full purchase and warranty info.
   */
  async getUnitsBySerials(serials: string[]) {
    if (!serials || serials.length === 0) return [];
    const validSerials = serials.filter(Boolean);
    if (validSerials.length === 0) return [];

    const units = await InventoryUnit.find({ serialNumber: { $in: validSerials } })
      .sort({ purchaseDate: -1 })
      .exec();
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
