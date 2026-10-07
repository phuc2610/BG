import mongoose, { Schema, Document } from 'mongoose';

export interface IWarrantyCheckHistoryDocument extends Document {
  searchCode: string;
  sessionId?: string;
  serialNumber: string;
  brand?: string;
  modelName?: string;
  partNumber?: string;
  distributor?: string;
  productType?: string;
  searchMode: string;
  ocrData?: {
    rawText?: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
    partNumber?: string;
    distributor?: string;
    productType?: string;
    confidence?: number;
    imageUrl?: string;
  };
  userConfirmedData?: {
    brand?: string;
    model?: string;
    serialNumber?: string;
    partNumber?: string;
    distributor?: string;
    productType?: string;
  };
  queriedProviderIds: string[];
  providerResults: Array<{
    providerId: string;
    providerName: string;
    providerType: 'MANUFACTURER' | 'DISTRIBUTOR';
    status: 'ACTIVE' | 'EXPIRED' | 'NOT_FOUND' | 'ERROR' | 'UNKNOWN';
    serialNumber: string;
    productName?: string;
    model?: string;
    warrantyStartDate?: Date;
    warrantyEndDate?: Date;
    remainingDays?: number;
    warrantyType?: string;
    notes?: string;
    sourceUrl?: string;
    responseTimeMs?: number;
    error?: string;
  }>;
  overallStatus: 'ACTIVE' | 'EXPIRED' | 'NOT_FOUND' | 'PARTIAL' | 'ERROR';
  primaryProvider?: string;
  warrantyEndDate?: Date;
  remainingDays?: number;
  linkedUnitId?: mongoose.Types.ObjectId;
  linkedPurchaseId?: mongoose.Types.ObjectId;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const providerResultSchema = new Schema(
  {
    providerId: { type: String, required: true },
    providerName: { type: String, required: true },
    providerType: { type: String, enum: ['MANUFACTURER', 'DISTRIBUTOR'], required: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'NOT_FOUND', 'ERROR', 'UNKNOWN'],
      required: true,
    },
    serialNumber: { type: String, required: true },
    productName: String,
    model: String,
    warrantyStartDate: Date,
    warrantyEndDate: Date,
    remainingDays: Number,
    warrantyType: String,
    notes: String,
    sourceUrl: String,
    responseTimeMs: Number,
    error: String,
  },
  { _id: false }
);

const warrantyCheckHistorySchema = new Schema<IWarrantyCheckHistoryDocument>(
  {
    searchCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },
    serialNumber: {
      type: String,
      required: true,
      index: true,
    },
    brand: String,
    modelName: String,
    partNumber: String,
    distributor: String,
    productType: String,
    searchMode: {
      type: String,
      required: true,
      default: 'AUTO',
    },
    ocrData: {
      type: Schema.Types.Mixed,
      default: null,
    },
    userConfirmedData: {
      type: Schema.Types.Mixed,
      default: null,
    },
    queriedProviderIds: {
      type: [String],
      default: [],
    },
    providerResults: [providerResultSchema],
    overallStatus: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'NOT_FOUND', 'PARTIAL', 'ERROR'],
      default: 'NOT_FOUND',
      index: true,
    },
    primaryProvider: String,
    warrantyEndDate: Date,
    remainingDays: Number,
    linkedUnitId: {
      type: Schema.Types.ObjectId,
      ref: 'InventoryUnit',
    },
    linkedPurchaseId: {
      type: Schema.Types.ObjectId,
      ref: 'Purchase',
    },
    createdBy: {
      type: String,
      default: 'Admin',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

warrantyCheckHistorySchema.virtual('model').get(function (this: any) {
  return this.modelName;
}).set(function (this: any, val: string) {
  this.modelName = val;
});

warrantyCheckHistorySchema.index({
  serialNumber: 'text',
  searchCode: 'text',
  brand: 'text',
  modelName: 'text',
  distributor: 'text',
});

export const WarrantyCheckHistory = mongoose.model<IWarrantyCheckHistoryDocument>(
  'WarrantyCheckHistory',
  warrantyCheckHistorySchema
);

export async function generateWarrantySearchCode(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const prefix = `TC${year}${month}${day}`;

  const latest = await WarrantyCheckHistory.findOne({ searchCode: new RegExp(`^${prefix}`) })
    .sort({ searchCode: -1 })
    .exec();

  if (!latest) {
    return `${prefix}0001`;
  }

  const currentSeq = parseInt(latest.searchCode.slice(-4), 10);
  const nextSeq = String(currentSeq + 1).padStart(4, '0');
  return `${prefix}${nextSeq}`;
}
