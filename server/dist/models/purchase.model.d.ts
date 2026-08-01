import mongoose, { Schema, Document } from 'mongoose';
import { PaymentMethod, ProductCondition } from '../types';
export interface ISupplierPaymentDocument {
    paymentCode: string;
    amount: number;
    paymentDate: Date;
    paymentMethod: PaymentMethod;
    bankName?: string;
    referenceCode?: string;
    note?: string;
    createdAt: Date;
}
export interface IPurchaseItemDocument {
    product: mongoose.Types.ObjectId;
    productCode: string;
    productName: string;
    quantity: number;
    costPrice: number;
    condition: ProductCondition;
    supplierWarrantyMonths: number;
    serials: string[];
    total: number;
}
export interface IPurchaseDocument extends Document {
    ownerId?: Schema.Types.ObjectId;
    purchaseCode: string;
    supplierId: mongoose.Types.ObjectId;
    supplier: {
        name: string;
        companyName?: string;
        phone?: string;
    };
    purchaseDate: Date;
    notes?: string;
    items: IPurchaseItemDocument[];
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    dueDate?: Date;
    status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'DUE_SOON' | 'OVERDUE';
    payments: ISupplierPaymentDocument[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const Purchase: mongoose.Model<IPurchaseDocument, {}, {}, {}, mongoose.Document<unknown, {}, IPurchaseDocument, {}, {}> & IPurchaseDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
/**
 * Generates purchase code formatted: PNYYYYMM0001 per owner
 */
export declare function generatePurchaseCode(ownerId?: any): Promise<string>;
//# sourceMappingURL=purchase.model.d.ts.map