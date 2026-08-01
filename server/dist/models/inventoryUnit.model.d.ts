import mongoose, { Document } from 'mongoose';
import { InventoryUnitStatus, ProductCondition } from '../types';
export interface IInventoryUnitDocument extends Document {
    ownerId?: mongoose.Types.ObjectId;
    productId: mongoose.Types.ObjectId;
    productCode: string;
    productName: string;
    serialNumber: string;
    purchaseId?: mongoose.Types.ObjectId;
    purchaseCode?: string;
    supplierId?: mongoose.Types.ObjectId;
    supplierName?: string;
    purchaseDate: Date;
    purchasePrice: number;
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
    createdAt: Date;
    updatedAt: Date;
}
export declare const InventoryUnit: mongoose.Model<IInventoryUnitDocument, {}, {}, {}, mongoose.Document<unknown, {}, IInventoryUnitDocument, {}, {}> & IInventoryUnitDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=inventoryUnit.model.d.ts.map