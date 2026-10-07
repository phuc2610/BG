import { z } from 'zod';
import { ProductCategory, ProductCondition, QuoteStatus, DiscountType } from '../types';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Tên linh kiện là bắt buộc').max(200),
  category: z.nativeEnum(ProductCategory, { errorMap: () => ({ message: 'Danh mục không hợp lệ' }) }),
  brand: z.string().min(1, 'Thương hiệu là bắt buộc').max(100),
  model: z.string().min(1, 'Model là bắt buộc').max(100),
  description: z.string().max(5000).nullish().or(z.literal('')),
  imageUrl: z.string().nullish().or(z.literal('')),
  imagePublicId: z.string().nullish().or(z.literal('')),
  images: z.array(z.any()).optional(),
  specs: z
    .record(z.any())
    .nullish()
    .transform((val) => {
      if (!val) return {};
      const cleaned: Record<string, string> = {};
      for (const [k, v] of Object.entries(val)) {
        if (v !== null && v !== undefined && String(v).trim()) {
          cleaned[k] = String(v).trim();
        }
      }
      return cleaned;
    }),
});

export const createInventoryLotSchema = z.object({
  product: z.string().min(1, 'Vui lòng chọn Mã sản phẩm master'),
  condition: z.nativeEnum(ProductCondition, { errorMap: () => ({ message: 'Tình trạng không hợp lệ' }) }),
  costPrice: z.number().min(0, 'Giá vốn nhập phải >= 0'),
  quantity: z.number().int().min(1, 'Số lượng nhập kho phải >= 1'),
  serialNumber: z.string().optional(),
});

export const updateProductSchema = createProductSchema.partial();
