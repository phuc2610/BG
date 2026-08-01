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
exports.getSettings = exports.Settings = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const settingsSchema = new mongoose_1.Schema({
    ownerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
    },
    storeName: { type: String, default: 'NP Computer' },
    hotline: { type: String, default: '0123.456.789' },
    website: { type: String, default: '' },
    facebook: { type: String, default: '' },
    address: { type: String, default: '' },
    email: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    logoPublicId: { type: String, default: '' },
    qrPaymentUrl: { type: String, default: '' },
    qrPaymentPublicId: { type: String, default: '' },
    bankInfo: { type: String, default: '' },
    terms: {
        type: [String],
        default: [
            'Sản phẩm được bảo hành theo thời gian ghi trên báo giá.',
            'Bảo hành 1 đổi 1 trong 7 ngày đầu nếu lỗi do nhà sản xuất.',
            'Không bảo hành các trường hợp: rơi vỡ, vào nước, tự ý tháo lắp.',
            'Giá có thể thay đổi mà không báo trước.',
            'Báo giá có hiệu lực trong 7 ngày kể từ ngày lập.',
        ],
    },
    footerText: {
        type: String,
        default: 'Cảm ơn quý khách đã tin tưởng và lựa chọn NP Computer! 🙏',
    },
}, {
    timestamps: true,
});
exports.Settings = mongoose_1.default.model('Settings', settingsSchema);
/**
 * Get or create default settings per owner
 */
const getSettings = async (ownerId) => {
    const filter = {};
    if (ownerId)
        filter.ownerId = ownerId;
    let settings = await exports.Settings.findOne(filter);
    if (!settings) {
        settings = await exports.Settings.create(filter);
    }
    return settings;
};
exports.getSettings = getSettings;
//# sourceMappingURL=settings.model.js.map