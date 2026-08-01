import { InventoryRepository, ProductRepository } from '../repositories';
import { generateStockCode, IInventoryDocument } from '../models';
import { ProductCondition } from '../types';
import { AppError } from './product.service';

const inventoryRepo = new InventoryRepository();
const productRepo = new ProductRepository();

export class InventoryService {
  async search(query: any) {
    return inventoryRepo.search(query);
  }

  async getById(id: string) {
    const item = await inventoryRepo.findById(id);
    if (!item) throw new AppError('Lô hàng không tồn tại trong kho', 404);
    return item;
  }

  async create(data: {
    product: string;
    condition: ProductCondition;
    costPrice: number;
    quantity: number;
    supplier?: string;
    supplierWarranty?: string;
    serialNumber?: string;
    serialNumbers?: string[];
  }) {
    const masterProduct = await productRepo.findById(data.product);
    if (!masterProduct) throw new AppError('Mã sản phẩm không tồn tại trong hệ thống', 404);

    const qty = Math.max(1, Number(data.quantity) || 1);
    const rawSerials = data.serialNumbers || [];
    const createdLots: IInventoryDocument[] = [];

    for (let i = 0; i < qty; i++) {
      const stockCode = await generateStockCode();
      const itemSerial = (rawSerials[i] && rawSerials[i].trim()) || (i === 0 && data.serialNumber ? data.serialNumber.trim() : undefined);

      const lot = await inventoryRepo.create({
        stockCode,
        product: data.product as any,
        condition: data.condition,
        costPrice: data.costPrice,
        quantity: 1,
        supplier: data.supplier?.trim() || undefined,
        supplierWarranty: data.supplierWarranty?.trim() || undefined,
        serialNumber: itemSerial || undefined,
        serialNumbers: itemSerial ? [itemSerial] : [],
        importDate: new Date(),
        createdBy: 'Admin',
      } as any);

      createdLots.push(lot);
    }

    return createdLots[0];
  }

  async update(id: string, data: Partial<IInventoryDocument> & { serialNumbers?: string[] }) {
    // Validate serialNumbers if both serialNumbers and quantity are provided
    if (data.serialNumbers) {
      const serials = data.serialNumbers.filter(s => s.trim());
      const existingLot = await inventoryRepo.findById(id);
      const targetQty = data.quantity !== undefined ? data.quantity : existingLot?.quantity || 0;
      if (serials.length > 0 && serials.length !== targetQty) {
        throw new AppError(
          `Số lượng serial (${serials.length}) không khớp với số lượng tồn (${targetQty})`,
          400
        );
      }
      data.serialNumbers = serials;
    }

    const lot = await inventoryRepo.updateById(id, data as any);
    if (!lot) throw new AppError('Lô hàng không tồn tại', 404);
    return lot;
  }

  async delete(id: string) {
    return inventoryRepo.deleteById(id);
  }
}
