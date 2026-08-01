import mongoose, { Schema, Document } from 'mongoose';
import { CustomerType, ICustomerActivity } from '../types';

export interface ICustomerDocument extends Document {
  ownerId?: Schema.Types.ObjectId;
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

const customerActivitySchema = new Schema<ICustomerActivity>(
  {
    customerId: { type: Schema.Types.ObjectId as any, ref: 'Customer', required: true, index: true },
    action: { type: String, required: true },
    description: { type: String, required: true },
    relatedQuoteId: { type: Schema.Types.ObjectId as any, ref: 'Quote' },
    relatedQuoteCode: String,
    relatedInvoiceId: { type: Schema.Types.ObjectId as any, ref: 'Invoice' },
    relatedInvoiceCode: String,
    amount: Number,
    performedBy: { type: String, default: 'Admin' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const customerSchema = new Schema<ICustomerDocument>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    customerCode: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      index: true,
    },
    companyName: String,
    contactPerson: String,
    phone: {
      type: String,
      index: true,
    },
    secondaryPhone: String,
    email: String,
    facebook: String,
    zalo: String,
    address: String,
    taxCode: String,
    notes: String,
    customerType: {
      type: String,
      enum: Object.values(CustomerType),
      default: CustomerType.RETAIL,
      index: true,
    },
    avatarUrl: String,
    totalOrders: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    totalDebt: { type: Number, default: 0 },
    firstPurchaseDate: Date,
    lastPurchaseDate: Date,
    createdBy: { type: String, default: 'Admin' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

customerSchema.index({ ownerId: 1, customerCode: 1 }, { unique: true });

customerSchema.index({
  customerCode: 'text',
  name: 'text',
  phone: 'text',
  companyName: 'text',
});

export const Customer = mongoose.model<ICustomerDocument>('Customer', customerSchema);
export const CustomerActivity = mongoose.model<ICustomerActivity>('CustomerActivity', customerActivitySchema);

/**
 * Generates customer code formatted KH000001, KH000002... per owner
 */
export async function generateCustomerCode(ownerId?: any): Promise<string> {
  const filter: any = { customerCode: /^KH\d+/ };
  if (ownerId) filter.ownerId = ownerId;

  const latest = await Customer.findOne(filter)
    .sort({ customerCode: -1 })
    .exec();

  if (!latest) {
    return 'KH000001';
  }

  const currentSeq = parseInt(latest.customerCode.replace('KH', ''), 10);
  const nextSeq = String(currentSeq + 1).padStart(6, '0');
  return `KH${nextSeq}`;
}
