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
exports.Inventory = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
const inventorySchema = new mongoose_1.Schema({
    stockCode: {
        type: String,
        required: true,
        unique: true,
    },
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true,
    },
    condition: {
        type: String,
        enum: Object.values(types_1.ProductCondition),
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
        type: mongoose_1.Schema.Types.ObjectId,
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
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
inventorySchema.index({
    stockCode: 'text',
    serialNumber: 'text',
    supplier: 'text',
    soldQuoteCode: 'text',
    'soldToCustomer.name': 'text',
    'soldToCustomer.phone': 'text',
});
exports.Inventory = mongoose_1.default.model('Inventory', inventorySchema);
//# sourceMappingURL=inventory.model.js.map