import { ISupplierDocument } from '../models';
import { ISupplier, SupplierFilterQuery } from '../types';
export declare class SupplierService {
    getAll(query: SupplierFilterQuery): Promise<import("../types").PaginatedResponse<ISupplierDocument>>;
    getById(id: string): Promise<ISupplierDocument>;
    getStats(ownerId?: string): Promise<import("../types").SupplierStats>;
    create(data: Partial<ISupplier> & {
        ownerId?: string;
    }): Promise<ISupplierDocument>;
    update(id: string, data: Partial<ISupplierDocument>): Promise<ISupplierDocument>;
    delete(id: string): Promise<ISupplierDocument | null>;
    /**
     * Returns complete Supplier profile: Details + Purchases + Payments + Debt + Purchased Products
     */
    getFullProfile(id: string): Promise<{
        supplier: ISupplierDocument;
        purchases: import("../models").IPurchaseDocument[];
        payments: any[];
        purchasedUnits: import("../models").IInventoryUnitDocument[];
    }>;
}
//# sourceMappingURL=supplier.service.d.ts.map