import mongoose, { Document } from 'mongoose';
import { QuoteStatus, DiscountType, IQuoteItem, ICustomer } from '../types';
export interface IQuoteDocument extends Document {
    quoteCode: string;
    invoiceId?: mongoose.Types.ObjectId;
    invoiceCode?: string;
    customerId?: mongoose.Types.ObjectId;
    createdDate: Date;
    createdBy: string;
    customer: ICustomer;
    items: IQuoteItem[];
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
    status: QuoteStatus;
    showConditionInPdf: boolean;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Quote: mongoose.Model<IQuoteDocument, {}, {}, {}, mongoose.Document<unknown, {}, IQuoteDocument, {}, {}> & IQuoteDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=quote.model.d.ts.map