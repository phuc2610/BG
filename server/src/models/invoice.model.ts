import mongoose, { Schema, Document } from 'mongoose';
import {
  InvoiceStatus,
  PaymentMethod,
  DiscountType,
  IInvoicePayment,
  IInvoiceHistory,
  IInvoiceItem,
  ICustomer,
} from '../types';

export interface IInvoiceDocument extends Document {
  ownerId?: mongoose.Types.ObjectId;
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

const invoicePaymentSchema = new Schema<IInvoicePayment>(
  {
    paymentCode: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      default: PaymentMethod.CASH,
    },
    bankName: String,
    referenceCode: String,
    paymentDate: { type: Date, default: Date.now },
    notes: String,
    createdBy: { type: String, default: 'Admin' },
  },
  { timestamps: true }
);

const invoiceHistorySchema = new Schema<IInvoiceHistory>(
  {
    action: { type: String, required: true },
    description: { type: String, required: true },
    performedBy: { type: String, default: 'Admin' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
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

const invoiceItemSchema = new Schema<IInvoiceItem>(
  {
    inventoryItem: { type: Schema.Types.ObjectId, ref: 'Inventory' },
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    productSnapshot: { type: Schema.Types.Mixed, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    discount: { type: Number, default: 0, min: 0 },
    discountType: {
      type: String,
      enum: Object.values(DiscountType),
      default: DiscountType.FIXED,
    },
    warranty: { type: String, default: '12 tháng' },
    serialNumber: String,
    selectedSerials: { type: [String], default: [] },
    total: { type: Number, required: true, min: 0 },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const invoiceSchema = new Schema<IInvoiceDocument>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    invoiceCode: {
      type: String,
      required: true,
    },
    quoteId: {
      type: Schema.Types.ObjectId,
      ref: 'Quote',
      index: true,
    },
    quoteCode: {
      type: String,
      index: true,
    },
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
    updatedBy: String,
    customer: {
      type: customerSchema,
      required: true,
    },
    items: [invoiceItemSchema],
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    discountType: {
      type: String,
      enum: Object.values(DiscountType),
      default: DiscountType.FIXED,
    },
    shippingFee: { type: Number, default: 0 },
    vatEnabled: { type: Boolean, default: false },
    vatPercent: { type: Number, default: 10 },
    vatAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    remainingAmount: { type: Number, default: 0 },
    dueDate: Date,
    status: {
      type: String,
      enum: Object.values(InvoiceStatus),
      default: InvoiceStatus.UNPAID,
      index: true,
    },
    isDraft: { type: Boolean, default: true, index: true },
    isFinalized: { type: Boolean, default: false, index: true },
    finalizedAt: Date,
    payments: [invoicePaymentSchema],
    history: [invoiceHistorySchema],
    notes: String,
    showConditionInPdf: { type: Boolean, default: false },
    eInvoiceStatus: {
      type: String,
      enum: ['draft', 'issued', 'failed'],
      default: 'draft',
    },
    eInvoiceProvider: String,
    eInvoiceRef: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

invoiceSchema.index({ ownerId: 1, invoiceCode: 1 }, { unique: true });

invoiceSchema.index({
  invoiceCode: 'text',
  quoteCode: 'text',
  'customer.name': 'text',
  'customer.phone': 'text',
});

export const Invoice = mongoose.model<IInvoiceDocument>('Invoice', invoiceSchema);

/**
 * Generates invoice code formatted: HDYYYYMMDD0001 per owner
 */
export async function generateInvoiceCode(ownerId?: any): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePrefix = `HD${year}${month}${day}`;

  const filter: any = { invoiceCode: new RegExp(`^${datePrefix}`) };
  if (ownerId) filter.ownerId = ownerId;

  const latest = await Invoice.findOne(filter)
    .sort({ invoiceCode: -1 })
    .exec();

  if (!latest) {
    return `${datePrefix}0001`;
  }

  const currentSeq = parseInt(latest.invoiceCode.slice(-4), 10);
  const nextSeq = String(currentSeq + 1).padStart(4, '0');
  return `${datePrefix}${nextSeq}`;
}
