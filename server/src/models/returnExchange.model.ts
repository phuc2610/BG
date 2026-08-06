import mongoose, { Schema, Document } from 'mongoose';
import {
  ReturnExchangeType,
  ReturnItemCondition,
  InventoryUnitStatus,
  IReturnItem,
  IExchangeItem,
  IReturnExchangeTransaction,
} from '../types';

export interface IReturnExchangeDocument extends Document, Omit<IReturnExchangeTransaction, '_id'> {
  createdAt: Date;
  updatedAt: Date;
}

const returnItemSchema = new Schema(
  {
    order: { type: Number, required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    productCode: { type: String, required: true },
    productName: { type: String, required: true },
    serialNumber: String,
    originalSalePrice: { type: Number, required: true },
    originalCostPrice: { type: Number, required: true },
    refundAmount: { type: Number, default: 0 },
    debtReduction: { type: Number, default: 0 },
    retainedAmount: { type: Number, default: 0 },
    condition: {
      type: String,
      enum: Object.values(ReturnItemCondition),
      default: ReturnItemCondition.GOOD_RESTOCK,
    },
    inventoryStatusTarget: {
      type: String,
      enum: Object.values(InventoryUnitStatus),
      default: InventoryUnitStatus.AVAILABLE,
    },
    status: { type: String, default: 'RETURNED' },
  },
  { _id: false }
);

const exchangeItemSchema = new Schema(
  {
    order: { type: Number, required: true },
    oldProductId: { type: Schema.Types.ObjectId, ref: 'Product' },
    oldProductCode: { type: String, required: true },
    oldProductName: { type: String, required: true },
    oldSerialNumber: String,
    oldSalePrice: { type: Number, required: true },
    oldCostPrice: { type: Number, required: true },
    oldCondition: {
      type: String,
      enum: Object.values(ReturnItemCondition),
      default: ReturnItemCondition.GOOD_RESTOCK,
    },
    oldInventoryStatusTarget: {
      type: String,
      enum: Object.values(InventoryUnitStatus),
      default: InventoryUnitStatus.AVAILABLE,
    },

    newProductId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    newProductCode: { type: String, required: true },
    newProductName: { type: String, required: true },
    newSerialNumber: String,
    newSalePrice: { type: Number, required: true },
    newCostPrice: { type: Number, required: true },

    priceDifference: { type: Number, required: true },
    customerPaidExtra: { type: Number, default: 0 },
    customerDebtAdded: { type: Number, default: 0 },
    cashRefund: { type: Number, default: 0 },
    debtReduction: { type: Number, default: 0 },
    retainedAmount: { type: Number, default: 0 },
    status: { type: String, default: 'EXCHANGED' },
  },
  { _id: false }
);

const returnExchangeSchema = new Schema<IReturnExchangeDocument>(
  {
    transactionCode: {
      type: String,
      required: true,
      unique: true,
    },
    invoiceId: {
      type: Schema.Types.ObjectId as any,
      ref: 'Invoice',
      required: true,
      index: true,
    },
    invoiceCode: {
      type: String,
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId as any,
      ref: 'Customer',
      index: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(ReturnExchangeType),
      required: true,
    },
    returnedItems: [returnItemSchema],
    exchangedItems: [exchangeItemSchema],
    totalOriginalValue: { type: Number, default: 0 },
    totalRefundAmount: { type: Number, default: 0 },
    totalDebtReduction: { type: Number, default: 0 },
    totalRetainedAmount: { type: Number, default: 0 },
    totalCustomerPaidExtra: { type: Number, default: 0 },
    totalCustomerDebtAdded: { type: Number, default: 0 },
    profitAdjustment: { type: Number, default: 0 },
    reason: String,
    notes: String,
    createdBy: { type: String, default: 'Admin' },
  },
  { timestamps: true }
);


export const ReturnExchangeTransaction = mongoose.model<IReturnExchangeDocument>(
  'ReturnExchangeTransaction',
  returnExchangeSchema
);

/**
 * Generates transaction code formatted: TRA202608060001 or DOI202608060001
 */
export async function generateReturnExchangeCode(type: ReturnExchangeType): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const prefixStr = type === ReturnExchangeType.RETURN ? 'TRA' : 'DOI';
  const datePrefix = `${prefixStr}${year}${month}${day}`;

  const latest = await ReturnExchangeTransaction.findOne({
    transactionCode: new RegExp(`^${datePrefix}`),
  })
    .sort({ transactionCode: -1 })
    .exec();

  if (!latest) {
    return `${datePrefix}0001`;
  }

  const currentSeq = parseInt(latest.transactionCode.slice(-4), 10);
  const nextSeq = String(currentSeq + 1).padStart(4, '0');
  return `${datePrefix}${nextSeq}`;
}
