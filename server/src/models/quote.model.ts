import mongoose, { Schema, Document } from 'mongoose';
import {
  QuoteStatus,
  DiscountType,
  ICustomer,
  ProductCondition,
  IProductSpecs,
} from '../types';

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

const quoteItemSnapshotSchema = new Schema<IQuoteItemSnapshot>(
  {
    name: { type: String, required: true },
    productCode: { type: String, required: true },
    condition: { type: String, required: true },
    costPrice: { type: Number, default: 0 },
    specs: {
      type: new Schema<IProductSpecs>(
        {
          cpu: String,
          mainboard: String,
          ram: String,
          ssd: String,
          hdd: String,
          vga: String,
          psu: String,
          case: String,
          cooler: String,
          windows: String,
          office: String,
          accessories: String,
          notes: String,
        },
        { _id: false }
      ),
      default: () => ({}),
    },
    imageUrl: String,
    serialNumber: String,
  },
  { _id: false }
);

const quoteItemSchema = new Schema<IQuoteItemDocument>(
  {
    inventoryItem: {
      type: Schema.Types.ObjectId,
      ref: 'Inventory',
      required: true,
    },
    productSnapshot: {
      type: quoteItemSnapshotSchema,
      required: true,
    },
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
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    quoteCode: {
      type: String,
      required: true,
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

quoteSchema.index({ ownerId: 1, quoteCode: 1 }, { unique: true });

quoteSchema.index({
  quoteCode: 'text',
  'customer.name': 'text',
  'customer.phone': 'text',
});

export const Quote = mongoose.model<IQuoteDocument>('Quote', quoteSchema);
