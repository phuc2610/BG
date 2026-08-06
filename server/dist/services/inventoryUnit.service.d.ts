import mongoose from 'mongoose';
import { IInventoryUnitDocument } from '../models';
import { InventoryUnitStatus, InventoryUnitFilterQuery, ProductCategory } from '../types';
export declare class InventoryUnitService {
    getAll(query: InventoryUnitFilterQuery): Promise<import("../types").PaginatedResponse<IInventoryUnitDocument>>;
    getById(id: string): Promise<IInventoryUnitDocument>;
    updateListPrice(id: string, listPrice: number): Promise<mongoose.Document<unknown, {}, IInventoryUnitDocument, {}, {}> & IInventoryUnitDocument & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    /**
     * Aggregates physical inventory grouped by PRODUCT (Master Catalog item).
     * Calculates Available stock count, Reserved count, Sold count, and Stock Value at purchase price.
     */
    getGroupedInventory(query: {
        category?: ProductCategory;
        search?: string;
        warrantyStatus?: string;
    }): Promise<{
        productId: mongoose.Types.ObjectId;
        productCode: string;
        productName: string;
        category: ProductCategory;
        brand: string;
        imageUrl: any;
        availableStock: number;
        reservedStock: number;
        soldStock: number;
        totalStock: number;
        latestCostPrice: number;
        latestListPrice: any;
        totalStockValue: number;
        totalStockListValue: number;
    }[]>;
    /**
     * Aggregates physical inventory grouped by PRODUCT and CONDITION.
     * Allows quoting exact product variants by condition (New, Like New, 99%...) with precise stock counts per condition.
     */
    getGroupedInventoryByCondition(query: {
        search?: string;
    }): Promise<any[]>;
    /**
     * Returns individual physical serial units for a specific Product with calculated warranty days.
     */
    getUnitsByProduct(productId: string): Promise<{
        remainingWarrantyDays: number;
        warrantyStatus: "DUE_SOON" | "NORMAL" | "EXPIRED";
        productId: mongoose.Types.ObjectId;
        productCode: string;
        productName: string;
        serialNumber?: string;
        purchaseId?: mongoose.Types.ObjectId;
        purchaseCode?: string;
        supplierId?: mongoose.Types.ObjectId;
        supplierName?: string;
        purchaseDate: Date;
        purchasePrice: number;
        listPrice?: number;
        condition: import("../types").ProductCondition;
        supplierWarrantyMonths: number;
        supplierWarrantyStartDate: Date;
        supplierWarrantyEndDate: Date;
        status: InventoryUnitStatus;
        reservedByInvoiceId?: mongoose.Types.ObjectId;
        reservedByInvoiceCode?: string;
        soldInvoiceId?: mongoose.Types.ObjectId;
        soldInvoiceCode?: string;
        soldAt?: Date;
        history?: Array<{
            action: string;
            invoiceId?: mongoose.Types.ObjectId;
            invoiceCode?: string;
            note?: string;
            date: Date;
        }>;
        createdAt: Date;
        updatedAt: Date;
        _id: mongoose.Types.ObjectId;
        $locals: Record<string, unknown>;
        $op: "save" | "validate" | "remove" | null;
        $where: Record<string, unknown>;
        baseModelName?: string;
        collection: mongoose.Collection;
        db: mongoose.Connection;
        errors?: mongoose.Error.ValidationError;
        id?: any;
        isNew: boolean;
        schema: mongoose.Schema;
        __v: number;
    }[]>;
    /**
     * Updates condition of a specific serial unit.
     */
    updateUnitCondition(unitId: string, condition: any): Promise<IInventoryUnitDocument>;
}
//# sourceMappingURL=inventoryUnit.service.d.ts.map