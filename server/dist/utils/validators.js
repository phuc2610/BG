"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProductSchema = exports.createInventoryLotSchema = exports.createProductSchema = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
exports.createProductSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Tên linh kiện là bắt buộc').max(200),
    category: zod_1.z.nativeEnum(types_1.ProductCategory, { errorMap: () => ({ message: 'Danh mục không hợp lệ' }) }),
    brand: zod_1.z.string().min(1, 'Thương hiệu là bắt buộc').max(100),
    model: zod_1.z.string().min(1, 'Model là bắt buộc').max(100),
    description: zod_1.z.string().max(5000).nullish().or(zod_1.z.literal('')),
    imageUrl: zod_1.z.string().nullish().or(zod_1.z.literal('')),
    imagePublicId: zod_1.z.string().nullish().or(zod_1.z.literal('')),
    images: zod_1.z.array(zod_1.z.any()).optional(),
    specs: zod_1.z
        .record(zod_1.z.any())
        .nullish()
        .transform((val) => {
        if (!val)
            return {};
        const cleaned = {};
        for (const [k, v] of Object.entries(val)) {
            if (v !== null && v !== undefined && String(v).trim()) {
                cleaned[k] = String(v).trim();
            }
        }
        return cleaned;
    }),
});
exports.createInventoryLotSchema = zod_1.z.object({
    product: zod_1.z.string().min(1, 'Vui lòng chọn Mã sản phẩm master'),
    condition: zod_1.z.nativeEnum(types_1.ProductCondition, { errorMap: () => ({ message: 'Tình trạng không hợp lệ' }) }),
    costPrice: zod_1.z.number().min(0, 'Giá vốn nhập phải >= 0'),
    quantity: zod_1.z.number().int().min(1, 'Số lượng nhập kho phải >= 1'),
    serialNumber: zod_1.z.string().optional(),
});
exports.updateProductSchema = exports.createProductSchema.partial();
//# sourceMappingURL=validators.js.map