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
exports.getSettings = exports.Settings = exports.DEFAULT_BENEFITS = void 0;
const mongoose_1 = __importStar(require("mongoose"));
exports.DEFAULT_BENEFITS = [
    {
        id: 'b1',
        enabled: true,
        title: 'Sản phẩm chính hãng',
        description: '100% chính hãng,\nđầy đủ hóa đơn VAT.',
        sortOrder: 1,
    },
    {
        id: 'b2',
        enabled: true,
        title: 'Đổi trả linh hoạt',
        description: 'Hỗ trợ đổi trả trong\n7 ngày nếu có lỗi.',
        sortOrder: 2,
    },
    {
        id: 'b3',
        enabled: true,
        title: 'Bảo hành uy tín',
        description: 'Bảo hành theo hãng,\nhỗ trợ tận tâm.',
        sortOrder: 3,
    },
    {
        id: 'b4',
        enabled: true,
        title: 'Hỗ trợ nhanh chóng',
        description: 'Tư vấn 24/7,\ngiải đáp tận tình.',
        sortOrder: 4,
    },
];
const settingsSchema = new mongoose_1.Schema({
    storeName: { type: String, default: 'NP Computer' },
    tagline: { type: String, default: 'LINH KIỆN • PC GAMING • WORKSTATION' },
    hotline: { type: String, default: '0123.456.789' },
    website: { type: String, default: 'npcomputer.vn' },
    facebook: { type: String, default: 'facebook.com/npcomputer.vn' },
    address: { type: String, default: '130' },
    email: { type: String, default: 'thanh.nguyen@example.com' },
    logoUrl: { type: String, default: '' },
    logoPublicId: { type: String, default: '' },
    qrPaymentUrl: { type: String, default: '' },
    qrPaymentPublicId: { type: String, default: '' },
    signatureUrl: { type: String, default: '' },
    signaturePublicId: { type: String, default: '' },
    stampUrl: { type: String, default: '' },
    stampPublicId: { type: String, default: '' },
    thankYouAssetUrl: { type: String, default: '' },
    thankYouAssetPublicId: { type: String, default: '' },
    signerName: { type: String, default: 'NP Computer' },
    signerTitle: { type: String, default: 'XÁC NHẬN BÁO GIÁ / HÓA ĐƠN' },
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
    benefits: {
        type: [
            {
                id: { type: String, required: true },
                enabled: { type: Boolean, default: true },
                title: { type: String, default: '' },
                description: { type: String, default: '' },
                sortOrder: { type: Number, default: 1 },
            },
        ],
        default: exports.DEFAULT_BENEFITS,
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
 * Get or create global default settings
 */
const getSettings = async () => {
    let settings = await exports.Settings.findOne({});
    if (!settings) {
        settings = await exports.Settings.create({});
    }
    else if (!settings.benefits || settings.benefits.length === 0) {
        settings.benefits = exports.DEFAULT_BENEFITS;
        await settings.save();
    }
    return settings;
};
exports.getSettings = getSettings;
//# sourceMappingURL=settings.model.js.map