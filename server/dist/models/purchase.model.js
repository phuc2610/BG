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
exports.Purchase = void 0;
exports.generatePurchaseCode = generatePurchaseCode;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
const supplierPaymentSchema = new mongoose_1.Schema({
    paymentCode: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, default: Date.now },
    paymentMethod: {
        type: String,
        enum: Object.values(types_1.PaymentMethod),
        default: types_1.PaymentMethod.BANK_TRANSFER,
    },
    bankName: String,
    referenceCode: String,
    note: String,
}, { timestamps: true });
const purchaseItemSchema = new mongoose_1.Schema({
    product: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product', required: true },
    productCode: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    costPrice: { type: Number, required: true, min: 0 },
    listPrice: { type: Number, default: 0, min: 0 },
    condition: { type: String, enum: Object.values(types_1.ProductCondition), default: types_1.ProductCondition.LIKE_NEW },
    supplierWarrantyMonths: { type: Number, default: 12 },
    serials: { type: [String], default: [] },
    total: { type: Number, required: true, min: 0 },
}, { _id: false });
const purchaseSchema = new mongoose_1.Schema({
    purchaseCode: {
        type: String,
        required: true,
        unique: true,
    },
    supplierId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
purchaseSchema.index({
    purchaseCode: 'text',
    'supplier.name': 'text',
    'supplier.phone': 'text',
});
exports.Purchase = mongoose_1.default.model('Purchase', purchaseSchema);
/**
 * Generates purchase code formatted: PNYYYYMM0001
 */
async function generatePurchaseCode() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const datePrefix = `PN${year}${month}`;
    const latest = await exports.Purchase.findOne({ purchaseCode: new RegExp(`^${datePrefix}`) })
        .sort({ purchaseCode: -1 })
        .exec();
    if (!latest) {
        return `${datePrefix}0001`;
    }
    const currentSeq = parseInt(latest.purchaseCode.slice(-4), 10);
    const nextSeq = String(currentSeq + 1).padStart(4, '0');
    return `${datePrefix}${nextSeq}`;
}
//# sourceMappingURL=purchase.model.js.map