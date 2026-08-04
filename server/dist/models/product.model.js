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
exports.Product = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
const productImageSchema = new mongoose_1.Schema({
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    order: { type: Number, default: 0 },
    isThumbnail: { type: Boolean, default: false },
}, { _id: true });
const productSpecsSchema = new mongoose_1.Schema({
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
}, { _id: false });
const productSchema = new mongoose_1.Schema({
    productId: {
        type: String,
        required: true,
        unique: true,
    },
    productCode: {
        type: String,
        required: true,
        unique: true,
    },
    barcode: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
        index: true,
    },
    category: {
        type: String,
        enum: Object.values(types_1.ProductCategory),
        required: true,
        index: true,
    },
    brand: {
        type: String,
        required: true,
        index: true,
    },
    modelName: {
        type: String,
        required: true,
    },
    description: String,
    specs: {
        type: productSpecsSchema,
        default: () => ({}),
    },
    images: {
        type: [productImageSchema],
        default: [],
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
productSchema.index({
    name: 'text',
    productCode: 'text',
    barcode: 'text',
    brand: 'text',
    modelName: 'text',
});
productSchema.virtual('model').get(function () {
    return this.modelName;
}).set(function (val) {
    this.modelName = val;
});
productSchema.virtual('thumbnailUrl').get(function () {
    const thumbnail = this.images?.find((img) => img.isThumbnail);
    if (thumbnail)
        return thumbnail.url;
    if (this.images?.length > 0)
        return this.images[0].url;
    return null;
});
exports.Product = mongoose_1.default.model('Product', productSchema);
//# sourceMappingURL=product.model.js.map