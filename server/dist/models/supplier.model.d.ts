import mongoose, { Schema, Document } from 'mongoose';
export interface ISupplierDocument extends Document {
    ownerId?: Schema.Types.ObjectId;
    supplierCode: string;
    name: string;
    companyName?: string;
    phone?: string;
    zalo?: string;
    email?: string;
    address?: string;
    taxCode?: string;
    accountNumber?: string;
    bankName?: string;
    notes?: string;
    status: 'ACTIVE' | 'INACTIVE';
    totalPurchased: number;
    totalPaid: number;
    totalDebt: number;
    purchaseCount: number;
    lastPurchaseDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Supplier: mongoose.Model<ISupplierDocument, {}, {}, {}, mongoose.Document<unknown, {}, ISupplierDocument, {}, {}> & ISupplierDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
/**
 * Generates supplier code formatted: NCC000001, NCC000002... per owner
 */
export declare function generateSupplierCode(ownerId?: any): Promise<string>;
//# sourceMappingURL=supplier.model.d.ts.map