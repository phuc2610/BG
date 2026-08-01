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
exports.CustomerActivity = exports.Customer = void 0;
exports.generateCustomerCode = generateCustomerCode;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
const customerActivitySchema = new mongoose_1.Schema({
    customerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    action: { type: String, required: true },
    description: { type: String, required: true },
    relatedQuoteId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Quote' },
    relatedQuoteCode: String,
    relatedInvoiceId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Invoice' },
    relatedInvoiceCode: String,
    amount: Number,
    performedBy: { type: String, default: 'Admin' },
    createdAt: { type: Date, default: Date.now },
}, { timestamps: true });
const customerSchema = new mongoose_1.Schema({
    ownerId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        enum: Object.values(types_1.CustomerType),
        default: types_1.CustomerType.RETAIL,
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
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
customerSchema.index({ ownerId: 1, customerCode: 1 }, { unique: true });
customerSchema.index({
    customerCode: 'text',
    name: 'text',
    phone: 'text',
    companyName: 'text',
});
exports.Customer = mongoose_1.default.model('Customer', customerSchema);
exports.CustomerActivity = mongoose_1.default.model('CustomerActivity', customerActivitySchema);
/**
 * Generates customer code formatted KH000001, KH000002... per owner
 */
async function generateCustomerCode(ownerId) {
    const filter = { customerCode: /^KH\d+/ };
    if (ownerId)
        filter.ownerId = ownerId;
    const latest = await exports.Customer.findOne(filter)
        .sort({ customerCode: -1 })
        .exec();
    if (!latest) {
        return 'KH000001';
    }
    const currentSeq = parseInt(latest.customerCode.replace('KH', ''), 10);
    const nextSeq = String(currentSeq + 1).padStart(6, '0');
    return `KH${nextSeq}`;
}
//# sourceMappingURL=customer.model.js.map