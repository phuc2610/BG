import mongoose, { Schema, Document } from 'mongoose';
import { ProductCondition, ProductCategory, IProductSpecs } from '../types';

export interface IInventoryDocument extends Document {
  ownerId?: Schema.Types.ObjectId;
  stockCode: string;
  product: mongoose.Types.ObjectId;
  condition: ProductCondition;
  costPrice: number;
  quantity: number;
  supplier?: string;
  supplierWarranty?: string;
  serialNumber?: string;
  serialNumbers: string[];
  isSold?: boolean;
  soldToCustomer?: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
  };
  soldQuoteId?: mongoose.Types.ObjectId;
  soldQuoteCode?: string;
  soldDate?: Date;
  sellingPrice?: number;
  soldWarranty?: string;
  importDate: Date;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const inventorySchema = new Schema<IInventoryDocument>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    stockCode: {
      type: String,
      required: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    condition: {
      type: String,
      enum: Object.values(ProductCondition),
      required: true,
      index: true,
    },
    costPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
      index: true,
    },
    supplier: String,
    supplierWarranty: String,
    serialNumber: String,
    serialNumbers: {
      type: [String],
      default: [],
    },
    isSold: {
      type: Boolean,
      default: false,
      index: true,
    },
    soldToCustomer: {
      name: String,
      phone: String,
      email: String,
      address: String,
      notes: String,
    },
    soldQuoteId: {
      type: Schema.Types.ObjectId,
      ref: 'Quote',
    },
    soldQuoteCode: String,
    soldDate: Date,
    sellingPrice: Number,
    soldWarranty: String,
    importDate: {
      type: Date,
      default: Date.now,
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

inventorySchema.index({ ownerId: 1, stockCode: 1 }, { unique: true });

inventorySchema.index({
  stockCode: 'text',
  serialNumber: 'text',
  supplier: 'text',
  soldQuoteCode: 'text',
  'soldToCustomer.name': 'text',
  'soldToCustomer.phone': 'text',
});

export const Inventory = mongoose.model<IInventoryDocument>('Inventory', inventorySchema);


