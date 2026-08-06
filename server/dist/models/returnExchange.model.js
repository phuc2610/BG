"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReturnExchangeTransaction = void 0;
exports.generateReturnExchangeCode = generateReturnExchangeCode;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
const returnItemSchema = new mongoose_1.Schema({
    order: { type: Number, required: true },
    productId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product' },
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
        enum: Object.values(types_1.ReturnItemCondition),
        default: types_1.ReturnItemCondition.GOOD_RESTOCK,
    },
    inventoryStatusTarget: {
        type: String,
        enum: Object.values(types_1.InventoryUnitStatus),
        default: types_1.InventoryUnitStatus.AVAILABLE,
    },
    status: { type: String, default: 'RETURNED' },
}, { _id: false });
const exchangeItemSchema = new mongoose_1.Schema({
    order: { type: Number, required: true },
    oldProductId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product' },
    oldProductCode: { type: String, required: true },
    oldProductName: { type: String, required: true },
    oldSerialNumber: String,
    oldSalePrice: { type: Number, required: true },
    oldCostPrice: { type: Number, required: true },
    oldCondition: {
        type: String,
        enum: Object.values(types_1.ReturnItemCondition),
        default: types_1.ReturnItemCondition.GOOD_RESTOCK,
    },
    oldInventoryStatusTarget: {
        type: String,
        enum: Object.values(types_1.InventoryUnitStatus),
        default: types_1.InventoryUnitStatus.AVAILABLE,
    },
    newProductId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product', required: true },
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
}, { _id: false });
const returnExchangeSchema = new mongoose_1.Schema({
    transactionCode: {
        type: String,
        required: true,
        unique: true,
    },
    invoiceId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Customer',
        index: true,
    },
    customerName: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: Object.values(types_1.ReturnExchangeType),
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
}, { timestamps: true });
exports.ReturnExchangeTransaction = mongoose_1.default.model('ReturnExchangeTransaction', returnExchangeSchema);
/**
 * Generates transaction code formatted: TRA202608060001 or DOI202608060001
 */
async function generateReturnExchangeCode(type) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const prefixStr = type === types_1.ReturnExchangeType.RETURN ? 'TRA' : 'DOI';
    const datePrefix = `${prefixStr}${year}${month}${day}`;
    const latest = await exports.ReturnExchangeTransaction.findOne({
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
//# sourceMappingURL=returnExchange.model.js.map