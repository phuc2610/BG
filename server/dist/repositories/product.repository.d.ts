import { BaseRepository } from './base.repository';
import { IProductDocument } from '../models';
import { ProductFilterQuery, PaginatedResponse } from '../types';
export declare class ProductRepository extends BaseRepository<IProductDocument> {
    constructor();
    search(query: ProductFilterQuery): Promise<PaginatedResponse<IProductDocument>>;
    getStats(): Promise<{
        totalProducts: number;
        totalInventoryItems: number;
        totalStockQuantity: number;
        totalRevenue: number;
        totalCost: number;
        totalProfit: number;
        byCategory: Record<string, number>;
        byCondition: Record<string, number>;
    }>;
    getBrands(): Promise<string[]>;
}
//# sourceMappingURL=product.repository.d.ts.map