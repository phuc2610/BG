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
exports.InventoryUnit = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
const unitHistorySchema = new mongoose_1.Schema({
    action: { type: String, required: true },
    invoiceId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Invoice' },
    invoiceCode: String,
    note: String,
    date: { type: Date, default: Date.now },
}, { _id: false });
const inventoryUnitSchema = new mongoose_1.Schema({
    productId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        required: false,
        sparse: true, // unique only when a value is present (allows multiple null/undefined)
    },
    purchaseId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Purchase',
        index: true,
    },
    purchaseCode: String,
    supplierId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
    listPrice: {
        type: Number,
        default: 0,
        min: 0,
    },
    condition: {
        type: String,
        enum: Object.values(types_1.ProductCondition),
        default: types_1.ProductCondition.LIKE_NEW,
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
        enum: Object.values(types_1.InventoryUnitStatus),
        default: types_1.InventoryUnitStatus.AVAILABLE,
        index: true,
    },
    reservedByInvoiceId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Invoice',
        index: true,
    },
    reservedByInvoiceCode: String,
    soldInvoiceId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Invoice',
        index: true,
    },
    soldInvoiceCode: String,
    soldAt: Date,
    history: [unitHistorySchema],
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
inventoryUnitSchema.index({
    serialNumber: 'text',
    productCode: 'text',
    productName: 'text',
    supplierName: 'text',
    purchaseCode: 'text',
});
exports.InventoryUnit = mongoose_1.default.model('InventoryUnit', inventoryUnitSchema);
//# sourceMappingURL=inventoryUnit.model.js.map