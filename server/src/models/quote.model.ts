import mongoose, { Schema, Document } from 'mongoose';
import {
  ProductCategory,
  ProductCondition,
  QuoteStatus,
  DiscountType,
  IQuoteItem,
  ICustomer,
} from '../types';

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

const quoteItemSchema = new Schema<IQuoteItem>(
  {
    inventoryItem: Schema.Types.Mixed,
    productSnapshot: Schema.Types.Mixed,
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountType: {
      type: String,
      enum: Object.values(DiscountType),
      default: DiscountType.FIXED,
    },
    warranty: {
      type: String,
      default: '12 tháng',
    },
    serialNumber: String,
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

const customerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true },
    phone: String,
    email: String,
    address: String,
    notes: String,
  },
  { _id: false }
);

const quoteSchema = new Schema<IQuoteDocument>(
  {
    quoteCode: {
      type: String,
      required: true,
      unique: true,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    invoiceCode: String,
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      index: true,
    },
    createdDate: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: String,
      default: 'Admin',
    },
    customer: {
      type: customerSchema,
      required: true,
    },
    items: {
      type: [quoteItemSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    discountType: {
      type: String,
      enum: Object.values(DiscountType),
      default: DiscountType.FIXED,
    },
    shippingFee: {
      type: Number,
      default: 0,
    },
    vatEnabled: {
      type: Boolean,
      default: false,
    },
    vatPercent: {
      type: Number,
      default: 10,
    },
    vatAmount: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      default: 0,
    },
    totalCost: {
      type: Number,
      default: 0,
    },
    profit: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: Object.values(QuoteStatus),
      default: QuoteStatus.DRAFT,
      index: true,
    },
    showConditionInPdf: {
      type: Boolean,
      default: false,
    },
    notes: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

quoteSchema.index({
  quoteCode: 'text',
  'customer.name': 'text',
  'customer.phone': 'text',
});

export const Quote = mongoose.model<IQuoteDocument>('Quote', quoteSchema);
