import { IProductDocument } from '../models';
import { ProductCategory, ProductFilterQuery } from '../types';
export declare class AppError extends Error {
    statusCode: number;
    constructor(message: string, statusCode?: number);
}
export declare class ProductService {
    getAll(query: ProductFilterQuery): Promise<import("../types").PaginatedResponse<IProductDocument>>;
    getById(id: string): Promise<IProductDocument>;
    getStats(ownerId?: string): Promise<{
        totalProducts: number;
        totalInventoryItems: number;
        totalStockQuantity: number;
        totalRevenue: number;
        totalCost: number;
        totalProfit: number;
        byCategory: Record<string, number>;
        byCondition: Record<string, number>;
    }>;
    getBrands(ownerId?: string): Promise<string[]>;
    getRecent(limit?: number, ownerId?: string): Promise<IProductDocument[]>;
    create(data: {
        name: string;
        category: ProductCategory;
        brand: string;
        model: string;
        description?: string;
        specs?: any;
        createdBy?: string;
        ownerId?: string;
    }): Promise<IProductDocument>;
    update(id: string, data: Partial<IProductDocument>): Promise<IProductDocument>;
    delete(id: string): Promise<IProductDocument | null>;
    clone(id: string): Promise<IProductDocument>;
    uploadImages(id: string, files: Express.Multer.File[]): Promise<IProductDocument>;
    deleteImage(productId: string, imageId: string): Promise<IProductDocument>;
}
//# sourceMappingURL=product.service.d.ts.map