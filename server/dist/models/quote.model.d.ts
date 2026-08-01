import mongoose, { Schema, Document } from 'mongoose';
import { QuoteStatus, DiscountType, ICustomer, ProductCondition, IProductSpecs } from '../types';
export interface IQuoteItemSnapshot {
    name: string;
    productCode: string;
    condition: ProductCondition;
    costPrice: number;
    specs: IProductSpecs;
    imageUrl?: string;
    serialNumber?: string;
}
export interface IQuoteItemDocument {
    inventoryItem: mongoose.Types.ObjectId;
    productSnapshot: IQuoteItemSnapshot;
    unitPrice: number;
    quantity: number;
    discount: number;
    discountType: DiscountType;
    warranty: string;
    serialNumber?: string;
    total: number;
    order: number;
}
export interface IQuoteDocument extends Document {
    ownerId?: Schema.Types.ObjectId;
    quoteCode: string;
    invoiceId?: mongoose.Types.ObjectId;
    invoiceCode?: string;
    customerId?: mongoose.Types.ObjectId;
    createdDate: Date;
    createdBy: string;
    customer: ICustomer;
    items: IQuoteItemDocument[];
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
    showConditionInPdf?: boolean;
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