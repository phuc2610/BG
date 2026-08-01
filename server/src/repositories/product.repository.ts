import { FilterQuery } from 'mongoose';
import { BaseRepository } from './base.repository';
import { Product, IProductDocument, Inventory, Quote } from '../models';
import { ProductFilterQuery, PaginatedResponse, QuoteStatus } from '../types';

export class ProductRepository extends BaseRepository<IProductDocument> {
  constructor() {
    super(Product);
  }

  async search(query: ProductFilterQuery): Promise<PaginatedResponse<IProductDocument>> {
    const {
      page = 1,
      limit = 20,
      search,
      sort = 'createdAt',
      order = 'desc',
      category,
      brand,
    } = query;

    const filter: FilterQuery<IProductDocument> = {};

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

    if (category) filter.category = category;
    if (brand) filter.brand = new RegExp(brand, 'i');
    if ((query as any).ownerId) filter.ownerId = (query as any).ownerId;

    return this.findPaginated(filter, page, limit, sort, order);
  }

  async getStats(ownerId?: string): Promise<{
    totalProducts: number;
    totalInventoryItems: number;
    totalStockQuantity: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    byCategory: Record<string, number>;
    byCondition: Record<string, number>;
  }> {
    const filter: any = {};
    if (ownerId) filter.ownerId = ownerId;
    const matchStage = ownerId ? [{ $match: { ownerId } }] : [];
    const quoteMatchStage = ownerId ? [{ $match: { status: QuoteStatus.CONFIRMED, ownerId } }] : [{ $match: { status: QuoteStatus.CONFIRMED } }];

    const [
      totalProducts,
      totalInventoryItems,
      stockAgg,
      categoryStats,
      conditionStats,
      financialStats,
    ] = await Promise.all([
      this.model.countDocuments(filter),
      Inventory.countDocuments(filter),
      Inventory.aggregate([...matchStage, { $group: { _id: null, totalQty: { $sum: '$quantity' } } }]),
      this.aggregate([...matchStage, { $group: { _id: '$category', count: { $sum: 1 } } }]),
      Inventory.aggregate([...matchStage, { $group: { _id: '$condition', count: { $sum: 1 } } }]),
      Quote.aggregate([
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

    const byCategory: Record<string, number> = {};
    categoryStats.forEach((stat: { _id: string; count: number }) => {
      byCategory[stat._id] = stat.count;
    });

    const byCondition: Record<string, number> = {};
    conditionStats.forEach((stat: { _id: string; count: number }) => {
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

  async getBrands(ownerId?: string): Promise<string[]> {
    const filter: any = {};
    if (ownerId) filter.ownerId = ownerId;
    return this.model.distinct('brand', filter).exec();
  }
}
