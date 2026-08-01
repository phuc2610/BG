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
exports.Invoice = void 0;
exports.generateInvoiceCode = generateInvoiceCode;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
const invoicePaymentSchema = new mongoose_1.Schema({
    paymentCode: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: {
        type: String,
        enum: Object.values(types_1.PaymentMethod),
        default: types_1.PaymentMethod.CASH,
    },
    bankName: String,
    referenceCode: String,
    paymentDate: { type: Date, default: Date.now },
    notes: String,
    createdBy: { type: String, default: 'Admin' },
}, { timestamps: true });
const invoiceHistorySchema = new mongoose_1.Schema({
    action: { type: String, required: true },
    description: { type: String, required: true },
    performedBy: { type: String, default: 'Admin' },
    createdAt: { type: Date, default: Date.now },
}, { _id: false });
const customerSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    phone: String,
    email: String,
    address: String,
    notes: String,
}, { _id: false });
const invoiceItemSchema = new mongoose_1.Schema({
    inventoryItem: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Inventory' },
    productId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product' },
    productSnapshot: { type: mongoose_1.Schema.Types.Mixed, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    discount: { type: Number, default: 0, min: 0 },
    discountType: {
        type: String,
        enum: Object.values(types_1.DiscountType),
        default: types_1.DiscountType.FIXED,
    },
    warranty: { type: String, default: '12 tháng' },
    serialNumber: String,
    selectedSerials: { type: [String], default: [] },
    total: { type: Number, required: true, min: 0 },
    order: { type: Number, default: 0 },
}, { _id: false });
const invoiceSchema = new mongoose_1.Schema({
    ownerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
    },
    invoiceCode: {
        type: String,
        required: true,
    },
    quoteId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Quote',
        index: true,
    },
    quoteCode: {
        type: String,
        index: true,
    },
    customerId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        enum: Object.values(types_1.DiscountType),
        default: types_1.DiscountType.FIXED,
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
        enum: Object.values(types_1.InvoiceStatus),
        default: types_1.InvoiceStatus.UNPAID,
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
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
invoiceSchema.index({ ownerId: 1, invoiceCode: 1 }, { unique: true });
invoiceSchema.index({
    invoiceCode: 'text',
    quoteCode: 'text',
    'customer.name': 'text',
    'customer.phone': 'text',
});
exports.Invoice = mongoose_1.default.model('Invoice', invoiceSchema);
/**
 * Generates invoice code formatted: HDYYYYMMDD0001 per owner
 */
async function generateInvoiceCode(ownerId) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePrefix = `HD${year}${month}${day}`;
    const filter = { invoiceCode: new RegExp(`^${datePrefix}`) };
    if (ownerId)
        filter.ownerId = ownerId;
    const latest = await exports.Invoice.findOne(filter)
        .sort({ invoiceCode: -1 })
        .exec();
    if (!latest) {
        return `${datePrefix}0001`;
    }
    const currentSeq = parseInt(latest.invoiceCode.slice(-4), 10);
    const nextSeq = String(currentSeq + 1).padStart(4, '0');
    return `${datePrefix}${nextSeq}`;
}
//# sourceMappingURL=invoice.model.js.map