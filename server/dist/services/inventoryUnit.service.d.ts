import mongoose from 'mongoose';
import { IInventoryUnitDocument } from '../models';
import { InventoryUnitStatus, InventoryUnitFilterQuery, ProductCategory, ProductCondition } from '../types';
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
        inStockOnly?: string;
    }): Promise<{
        productId: any;
        productCode: any;
        productName: any;
        category: any;
        brand: any;
        imageUrl: any;
        availableStock: number;
        reservedStock: number;
        soldStock: number;
        totalStock: number;
        latestCostPrice: any;
        latestListPrice: any;
        totalStockValue: any;
        totalStockListValue: any;
    }[]>;
    /**
     * Returns flat array of all in-stock InventoryUnits with product info for Excel export.
     */
    getExportData(query: {
        category?: ProductCategory;
        search?: string;
        inStockOnly?: string;
    }): Promise<{
        unitId: mongoose.Types.ObjectId;
        productId: mongoose.Types.ObjectId;
        productCode: string;
        productName: string;
        category: string;
        brand: string;
        condition: ProductCondition;
        serialNumber: string;
        supplierName: string;
        purchaseCode: string;
        purchaseDate: Date;
        purchasePrice: number;
        listPrice: any;
        supplierWarrantyMonths: number;
        supplierWarrantyEndDate: Date;
        warrantyStatusLabel: string;
        remainingDays: number;
        status: InventoryUnitStatus;
        statusLabel: string;
    }[]>;
    /**
     * Fast grouped inventory by condition for Quotes & Invoices.
     * Uses single batch query to eliminate N+1 latency.
     */
    getGroupedInventoryByCondition(query: {
        search?: string;
    }): Promise<any[]>;
    /**
     * Returns individual physical serial units for a specific Product with calculated warranty days
     * and buyer customer info if the unit was sold or reserved.
     */
    getUnitsByProduct(productId: string): Promise<{
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
            isFinalized: any;
        } | null;
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
        condition: ProductCondition;
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
     * Returns units matching a list of serial numbers with full purchase and warranty info.
     */
    getUnitsBySerials(serials: string[]): Promise<{
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
        condition: ProductCondition;
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