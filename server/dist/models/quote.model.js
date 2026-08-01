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
exports.Quote = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
const quoteItemSnapshotSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    productCode: { type: String, required: true },
    condition: { type: String, required: true },
    costPrice: { type: Number, default: 0 },
    specs: {
        type: new mongoose_1.Schema({
            cpu: String,
            mainboard: String,
            ram: String,
            ssd: String,
            hdd: String,
            vga: String,
            psu: String,
            case: String,
            cooler: String,
            windows: String,
            office: String,
            accessories: String,
            notes: String,
        }, { _id: false }),
        default: () => ({}),
    },
    imageUrl: String,
    serialNumber: String,
}, { _id: false });
const quoteItemSchema = new mongoose_1.Schema({
    inventoryItem: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Inventory',
        required: true,
    },
    productSnapshot: {
        type: quoteItemSnapshotSchema,
        required: true,
    },
    unitPrice: {
        type: Number,
        required: true,
        min: 0,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1,
    },
    discount: {
        type: Number,
        default: 0,
        min: 0,
    },
    discountType: {
        type: String,
        enum: Object.values(types_1.DiscountType),
        default: types_1.DiscountType.FIXED,
    },
    warranty: {
        type: String,
        default: '12 tháng',
    },
    serialNumber: String,
    total: {
        type: Number,
        required: true,
        min: 0,
    },
    order: {
        type: Number,
        default: 0,
    },
}, { _id: true });
const customerSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    phone: String,
    email: String,
    address: String,
    notes: String,
}, { _id: false });
const quoteSchema = new mongoose_1.Schema({
    ownerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
    },
    quoteCode: {
        type: String,
        required: true,
    },
    invoiceId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Invoice',
    },
    invoiceCode: String,
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
    customer: {
        type: customerSchema,
        required: true,
    },
    items: {
        type: [quoteItemSchema],
        default: [],
    },
    subtotal: {
        type: Number,
        default: 0,
    },
    discount: {
        type: Number,
        default: 0,
    },
    discountType: {
        type: String,
        enum: Object.values(types_1.DiscountType),
        default: types_1.DiscountType.FIXED,
    },
    shippingFee: {
        type: Number,
        default: 0,
    },
    vatEnabled: {
        type: Boolean,
        default: false,
    },
    vatPercent: {
        type: Number,
        default: 10,
    },
    vatAmount: {
        type: Number,
        default: 0,
    },
    grandTotal: {
        type: Number,
        default: 0,
    },
    totalCost: {
        type: Number,
        default: 0,
    },
    profit: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: Object.values(types_1.QuoteStatus),
        default: types_1.QuoteStatus.DRAFT,
        index: true,
    },
    showConditionInPdf: {
        type: Boolean,
        default: false,
    },
    notes: String,
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
quoteSchema.index({ ownerId: 1, quoteCode: 1 }, { unique: true });
quoteSchema.index({
    quoteCode: 'text',
    'customer.name': 'text',
    'customer.phone': 'text',
});
exports.Quote = mongoose_1.default.model('Quote', quoteSchema);
//# sourceMappingURL=quote.model.js.map