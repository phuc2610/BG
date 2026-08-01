import mongoose, { Schema, Document } from 'mongoose';
import { InventoryUnitStatus, ProductCondition } from '../types';

export interface IInventoryUnitDocument extends Document {
  ownerId?: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  productCode: string;
  productName: string;
  serialNumber: string;
  purchaseId?: mongoose.Types.ObjectId;
  purchaseCode?: string;
  supplierId?: mongoose.Types.ObjectId;
  supplierName?: string;
  purchaseDate: Date;
  purchasePrice: number;
  condition: ProductCondition;
  supplierWarrantyMonths: number;
  supplierWarrantyStartDate: Date;
  supplierWarrantyEndDate: Date;
  status: InventoryUnitStatus;
  reservedByInvoiceId?: mongoose.Types.ObjectId;
  reservedByInvoiceCode?: string;
  soldInvoiceId?: mongoose.Types.ObjectId;
  soldInvoiceCode?: string;
  soldAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryUnitSchema = new Schema<IInventoryUnitDocument>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    productCode: {
      type: String,
      required: true,
      index: true,
    },
    productName: {
      type: String,
      required: true,
      index: true,
    },
    serialNumber: {
      type: String,
      required: true,
    },
    purchaseId: {
      type: Schema.Types.ObjectId,
      ref: 'Purchase',
      index: true,
    },
    purchaseCode: String,
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      index: true,
    },
    supplierName: String,
    purchaseDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    purchasePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    condition: {
      type: String,
      enum: Object.values(ProductCondition),
      default: ProductCondition.LIKE_NEW,
      index: true,
    },
    supplierWarrantyMonths: {
      type: Number,
      default: 12,
    },
    supplierWarrantyStartDate: {
      type: Date,
      default: Date.now,
    },
    supplierWarrantyEndDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(InventoryUnitStatus),
      default: InventoryUnitStatus.AVAILABLE,
      index: true,
    },
    reservedByInvoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      index: true,
    },
    reservedByInvoiceCode: String,
    soldInvoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      index: true,
    },
    soldInvoiceCode: String,
    soldAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

inventoryUnitSchema.index({ ownerId: 1, serialNumber: 1 }, { unique: true });

inventoryUnitSchema.index({
  serialNumber: 'text',
  productCode: 'text',
  productName: 'text',
  supplierName: 'text',
  purchaseCode: 'text',
});

export const InventoryUnit = mongoose.model<IInventoryUnitDocument>('InventoryUnit', inventoryUnitSchema);
