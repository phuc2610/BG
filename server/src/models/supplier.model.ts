import mongoose, { Schema, Document } from 'mongoose';

export interface ISupplierDocument extends Document {
  supplierCode: string;
  name: string;
  companyName?: string;
  phone?: string;
  zalo?: string;
  email?: string;
  address?: string;
  taxCode?: string;
  accountNumber?: string;
  bankName?: string;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE';
  totalPurchased: number;
  totalPaid: number;
  totalDebt: number;
  purchaseCount: number;
  lastPurchaseDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const supplierSchema = new Schema<ISupplierDocument>(
  {
    supplierCode: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      index: true,
    },
    companyName: String,
    phone: {
      type: String,
      index: true,
    },
    zalo: String,
    email: String,
    address: String,
    taxCode: String,
    accountNumber: String,
    bankName: String,
    notes: String,
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
    totalPurchased: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    totalDebt: { type: Number, default: 0 },
    purchaseCount: { type: Number, default: 0 },
    lastPurchaseDate: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

supplierSchema.index({
  supplierCode: 'text',
  name: 'text',
  phone: 'text',
  companyName: 'text',
});

export const Supplier = mongoose.model<ISupplierDocument>('Supplier', supplierSchema);

/**
 * Generates supplier code formatted: NCC000001, NCC000002...
 */
export async function generateSupplierCode(): Promise<string> {
  const latest = await Supplier.findOne({ supplierCode: /^NCC\d+/ })
    .sort({ supplierCode: -1 })
    .exec();

  if (!latest) {
    return 'NCC000001';
  }

  const currentSeq = parseInt(latest.supplierCode.replace('NCC', ''), 10);
  const nextSeq = String(currentSeq + 1).padStart(6, '0');
  return `NCC${nextSeq}`;
}
