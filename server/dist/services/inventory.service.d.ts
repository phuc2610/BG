import { IInventoryDocument } from '../models';
import { ProductCondition } from '../types';
export declare class InventoryService {
    search(query: any): Promise<import("../types").PaginatedResponse<any>>;
    getById(id: string): Promise<IInventoryDocument>;
    create(data: {
        product: string;
        condition: ProductCondition;
        costPrice: number;
        quantity: number;
        supplier?: string;
        supplierWarranty?: string;
        serialNumber?: string;
        serialNumbers?: string[];
    }): Promise<IInventoryDocument>;
    update(id: string, data: Partial<IInventoryDocument> & {
        serialNumbers?: string[];
    }): Promise<IInventoryDocument>;
    delete(id: string): Promise<IInventoryDocument | null>;
}
//# sourceMappingURL=inventory.service.d.ts.map