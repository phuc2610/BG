import mongoose, { Document } from 'mongoose';
import { ProductCondition } from '../types';
export interface IInventoryDocument extends Document {
    stockCode: string;
    product: mongoose.Types.ObjectId;
    condition: ProductCondition;
    costPrice: number;
    quantity: number;
    supplier?: string;
    supplierWarranty?: string;
    serialNumber?: string;
    serialNumbers: string[];
    isSold?: boolean;
    soldToCustomer?: {
        name: string;
        phone?: string;
        email?: string;
        address?: string;
        notes?: string;
    };
    soldQuoteId?: mongoose.Types.ObjectId;
    soldQuoteCode?: string;
    soldDate?: Date;
    sellingPrice?: number;
    soldWarranty?: string;
    importDate: Date;
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Inventory: mongoose.Model<IInventoryDocument, {}, {}, {}, mongoose.Document<unknown, {}, IInventoryDocument, {}, {}> & IInventoryDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=inventory.model.d.ts.map