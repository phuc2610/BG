import { ISupplierDocument } from '../models';
import { ISupplier, SupplierFilterQuery } from '../types';
export declare class SupplierService {
    getAll(query: SupplierFilterQuery): Promise<import("../types").PaginatedResponse<ISupplierDocument>>;
    getById(id: string): Promise<ISupplierDocument>;
    getStats(): Promise<import("../types").SupplierStats>;
    create(data: Partial<ISupplier>): Promise<ISupplierDocument>;
    update(id: string, data: Partial<ISupplier>): Promise<ISupplierDocument>;
    delete(id: string): Promise<ISupplierDocument | null>;
    getFullProfile(id: string): Promise<{
        supplier: ISupplierDocument;
        purchases: any[];
        payments: any[];
        purchasedUnits: {
            remainingWarrantyDays: number;
            warrantyStatus: "DUE_SOON" | "NORMAL" | "EXPIRED";
            customerInfo: {
                customerId: any;
                customerName: any;
                customerPhone: any;
                customerEmail: any;
                customerAddress: any;
                invoiceId: any;
                invoiceCode: any;
                soldAt: any;
                sellerName: any;
                isFinalized: any;
            } | null;
            productId: import("mongoose").Types.ObjectId;
            productCode: string;
            productName: string;
            serialNumber?: string;
            purchaseId?: import("mongoose").Types.ObjectId;
            purchaseCode?: string;
            supplierId?: import("mongoose").Types.ObjectId;
            supplierName?: string;
            purchaseDate: Date;
            purchasePrice: number;
            listPrice?: number;
            condition: import("../types").ProductCondition;
            supplierWarrantyMonths: number;
            supplierWarrantyStartDate: Date;
            supplierWarrantyEndDate: Date;
            status: import("../types").InventoryUnitStatus;
            reservedByInvoiceId?: import("mongoose").Types.ObjectId;
            reservedByInvoiceCode?: string;
            soldInvoiceId?: import("mongoose").Types.ObjectId;
            soldInvoiceCode?: string;
            soldAt?: Date;
            history?: Array<{
                action: string;
                invoiceId?: import("mongoose").Types.ObjectId;
                invoiceCode?: string;
                note?: string;
                date: Date;
            }>;
            createdAt: Date;
            updatedAt: Date;
            _id: import("mongoose").Types.ObjectId;
            $locals: Record<string, unknown>;
            $op: "save" | "validate" | "remove" | null;
            $where: Record<string, unknown>;
            baseModelName?: string;
            collection: import("mongoose").Collection;
            db: import("mongoose").Connection;
            errors?: import("mongoose").Error.ValidationError;
            id?: any;
            isNew: boolean;
            schema: import("mongoose").Schema;
            __v: number;
        }[];
    }>;
}
//# sourceMappingURL=supplier.service.d.ts.map