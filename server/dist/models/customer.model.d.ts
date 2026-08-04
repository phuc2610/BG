import mongoose, { Document } from 'mongoose';
import { CustomerType, ICustomerActivity } from '../types';
export interface ICustomerDocument extends Document {
    customerCode: string;
    name: string;
    companyName?: string;
    contactPerson?: string;
    phone?: string;
    secondaryPhone?: string;
    email?: string;
    facebook?: string;
    zalo?: string;
    address?: string;
    taxCode?: string;
    notes?: string;
    customerType: CustomerType;
    avatarUrl?: string;
    totalOrders: number;
    totalRevenue: number;
    totalPaid: number;
    totalDebt: number;
    firstPurchaseDate?: Date;
    lastPurchaseDate?: Date;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Customer: mongoose.Model<ICustomerDocument, {}, {}, {}, mongoose.Document<unknown, {}, ICustomerDocument, {}, {}> & ICustomerDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const CustomerActivity: mongoose.Model<ICustomerActivity, {}, {}, {}, mongoose.Document<unknown, {}, ICustomerActivity, {}, {}> & ICustomerActivity & Required<{
    _id: string;
}> & {
    __v: number;
}, any>;
/**
 * Generates customer code formatted KH000001, KH000002...
 */
export declare function generateCustomerCode(): Promise<string>;
//# sourceMappingURL=customer.model.d.ts.map