import mongoose, { Document } from 'mongoose';
import { InvoiceStatus, DiscountType, IInvoicePayment, IInvoiceHistory, IInvoiceItem, ICustomer } from '../types';
export interface IInvoiceDocument extends Document {
    invoiceCode: string;
    quoteId?: mongoose.Types.ObjectId;
    quoteCode?: string;
    customerId?: mongoose.Types.ObjectId;
    createdDate: Date;
    createdBy: string;
    updatedBy?: string;
    customer: ICustomer;
    items: IInvoiceItem[];
    subtotal: number;
    discount: number;
    discountType: DiscountType;
    shippingFee: number;
    vatEnabled: boolean;
    vatPercent: number;
    vatAmount: number;
    grandTotal: number;
    totalCost: number;
    profit: number;
    totalPaid: number;
    remainingAmount: number;
    dueDate?: Date;
    status: InvoiceStatus;
    isDraft: boolean;
    isFinalized: boolean;
    finalizedAt?: Date;
    payments: IInvoicePayment[];
    history: IInvoiceHistory[];
    notes?: string;
    showConditionInPdf?: boolean;
    eInvoiceStatus?: 'draft' | 'issued' | 'failed';
    eInvoiceProvider?: string;
    eInvoiceRef?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Invoice: mongoose.Model<IInvoiceDocument, {}, {}, {}, mongoose.Document<unknown, {}, IInvoiceDocument, {}, {}> & IInvoiceDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
/**
 * Generates invoice code formatted: HDYYYYMMDD0001
 */
export declare function generateInvoiceCode(): Promise<string>;
//# sourceMappingURL=invoice.model.d.ts.map