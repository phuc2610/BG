import { z } from 'zod';
import { ProductCategory, ProductCondition, QuoteStatus, DiscountType } from '../types';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Tên linh kiện là bắt buộc').max(200),
  category: z.nativeEnum(ProductCategory, { errorMap: () => ({ message: 'Danh mục không hợp lệ' }) }),
  brand: z.string().min(1, 'Thương hiệu là bắt buộc').max(100),
  model: z.string().min(1, 'Model là bắt buộc').max(100),
  description: z.string().max(5000).optional(),
  specs: z.object({
    cpu: z.string().optional(),
    mainboard: z.string().optional(),
    ram: z.string().optional(),
    ssd: z.string().optional(),
    hdd: z.string().optional(),
    vga: z.string().optional(),
    psu: z.string().optional(),
    case: z.string().optional(),
    cooler: z.string().optional(),
    windows: z.string().optional(),
    office: z.string().optional(),
    accessories: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
});

export const createInventoryLotSchema = z.object({
  product: z.string().min(1, 'Vui lòng chọn Mã sản phẩm master'),
  condition: z.nativeEnum(ProductCondition, { errorMap: () => ({ message: 'Tình trạng không hợp lệ' }) }),
  costPrice: z.number().min(0, 'Giá vốn nhập phải >= 0'),
  quantity: z.number().int().min(1, 'Số lượng nhập kho phải >= 1'),
  serialNumber: z.string().optional(),
});

export const updateProductSchema = createProductSchema.partial();
