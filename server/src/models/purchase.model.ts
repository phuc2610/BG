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
  listPrice?: number;
  condition: ProductCondition;
  supplierWarrantyMonths: number;
  serials: string[];
  total: number;
}

export interface IPurchaseDocument extends Document {
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
  isDraft?: boolean;
  status: 'DRAFT' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'DUE_SOON' | 'OVERDUE';
  payments: ISupplierPaymentDocument[];
  createdAt: Date;
  updatedAt: Date;
}

const supplierPaymentSchema = new Schema<ISupplierPaymentDocument>(
  {
    paymentCode: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, default: Date.now },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      default: PaymentMethod.BANK_TRANSFER,
    },
    bankName: String,
    referenceCode: String,
    note: String,
  },
  { timestamps: true }
);

const purchaseItemSchema = new Schema<IPurchaseItemDocument>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productCode: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    costPrice: { type: Number, required: true, min: 0 },
    listPrice: { type: Number, default: 0, min: 0 },
    condition: { type: String, enum: Object.values(ProductCondition), default: ProductCondition.LIKE_NEW },
    supplierWarrantyMonths: { type: Number, default: 12 },
    serials: { type: [String], default: [] },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const purchaseSchema = new Schema<IPurchaseDocument>(
  {
    purchaseCode: {
      type: String,
      required: true,
      unique: true,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      index: true,
    },
    supplier: {
      name: { type: String, required: true },
      companyName: String,
      phone: String,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    notes: String,
    items: [purchaseItemSchema],
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    remainingAmount: { type: Number, default: 0, min: 0 },
    dueDate: Date,
    isDraft: { type: Boolean, default: false, index: true },
    status: {
      type: String,
      enum: ['DRAFT', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'DUE_SOON', 'OVERDUE'],
      default: 'UNPAID',
      index: true,
    },
    payments: [supplierPaymentSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

purchaseSchema.index({
  purchaseCode: 'text',
  'supplier.name': 'text',
  'supplier.phone': 'text',
});

export const Purchase = mongoose.model<IPurchaseDocument>('Purchase', purchaseSchema);

/**
 * Generates purchase code formatted: PNYYYYMM0001
 */
export async function generatePurchaseCode(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const datePrefix = `PN${year}${month}`;

  const latest = await Purchase.findOne({ purchaseCode: new RegExp(`^${datePrefix}`) })
    .sort({ purchaseCode: -1 })
    .exec();

  if (!latest) {
    return `${datePrefix}0001`;
  }

  const currentSeq = parseInt(latest.purchaseCode.slice(-4), 10);
  const nextSeq = String(currentSeq + 1).padStart(4, '0');
  return `${datePrefix}${nextSeq}`;
}
