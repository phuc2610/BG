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
exports.generateStockCode = exports.generateQuoteCode = exports.generateProductCode = exports.generateProductId = exports.getNextSequence = exports.Counter = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const counterSchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 },
});
exports.Counter = mongoose_1.default.model('Counter', counterSchema);
const getNextSequence = async (name, ownerId) => {
    const counterName = ownerId ? `${name}_${ownerId}` : name;
    const counter = await exports.Counter.findOneAndUpdate({ name: counterName }, { $inc: { seq: 1 } }, { new: true, upsert: true });
    return counter.seq;
};
exports.getNextSequence = getNextSequence;
const generateProductId = async (ownerId) => {
    const seq = await (0, exports.getNextSequence)('productId', ownerId);
    return `SP${String(seq).padStart(6, '0')}`;
};
exports.generateProductId = generateProductId;
const generateProductCode = async (category, ownerId) => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const counterName = `productCode_${category}_${yy}${mm}`;
    const seq = await (0, exports.getNextSequence)(counterName, ownerId);
    const categoryCode = category.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    return `NPC-${categoryCode}-${yy}${mm}${String(seq).padStart(4, '0')}`;
};
exports.generateProductCode = generateProductCode;
const generateQuoteCode = async (ownerId) => {
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;
    const counterName = `quoteCode_${dateStr}`;
    const seq = await (0, exports.getNextSequence)(counterName, ownerId);
    return `BG${dateStr}${String(seq).padStart(4, '0')}`;
};
exports.generateQuoteCode = generateQuoteCode;
const generateStockCode = async (ownerId) => {
    const seq = await (0, exports.getNextSequence)('stockCode', ownerId);
    return `NK${String(seq).padStart(6, '0')}`;
};
exports.generateStockCode = generateStockCode;
//# sourceMappingURL=counter.model.js.map