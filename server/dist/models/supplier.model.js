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
exports.Supplier = void 0;
exports.generateSupplierCode = generateSupplierCode;
const mongoose_1 = __importStar(require("mongoose"));
const supplierSchema = new mongoose_1.Schema({
    supplierCode: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
        index: true,
    },
    companyName: String,
    phone: {
        type: String,
        index: true,
    },
    zalo: String,
    email: String,
    address: String,
    taxCode: String,
    accountNumber: String,
    bankName: String,
    notes: String,
    status: {
        type: String,
        enum: ['ACTIVE', 'INACTIVE'],
        default: 'ACTIVE',
    },
    totalPurchased: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    totalDebt: { type: Number, default: 0 },
    purchaseCount: { type: Number, default: 0 },
    lastPurchaseDate: Date,
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
supplierSchema.index({
    supplierCode: 'text',
    name: 'text',
    phone: 'text',
    companyName: 'text',
});
exports.Supplier = mongoose_1.default.model('Supplier', supplierSchema);
/**
 * Generates supplier code formatted: NCC000001, NCC000002...
 */
async function generateSupplierCode() {
    const latest = await exports.Supplier.findOne({ supplierCode: /^NCC\d+/ })
        .sort({ supplierCode: -1 })
        .exec();
    if (!latest) {
        return 'NCC000001';
    }
    const currentSeq = parseInt(latest.supplierCode.replace('NCC', ''), 10);
    const nextSeq = String(currentSeq + 1).padStart(6, '0');
    return `NCC${nextSeq}`;
}
//# sourceMappingURL=supplier.model.js.map