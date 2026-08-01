import { SupplierRepository, PurchaseRepository, InventoryUnitRepository } from '../repositories';
import { Supplier, generateSupplierCode, ISupplierDocument, Purchase } from '../models';
import { ISupplier, SupplierFilterQuery } from '../types';
import { AppError } from './product.service';

const supplierRepo = new SupplierRepository();
const purchaseRepo = new PurchaseRepository();
const unitRepo = new InventoryUnitRepository();

export class SupplierService {
  async getAll(query: SupplierFilterQuery) {
    return supplierRepo.search(query);
  }

  async getById(id: string) {
    const supplier = await supplierRepo.findById(id);
    if (!supplier) throw new AppError('Nhà cung cấp không tồn tại', 404);
    return supplier;
  }

  async getStats(ownerId?: string) {
    return supplierRepo.getStats(ownerId);
  }

  async create(data: Partial<ISupplier> & { ownerId?: string }) {
    if (!data.name || !data.name.trim()) {
      throw new AppError('Tên nhà cung cấp là bắt buộc', 400);
    }

    const supplierCode = await generateSupplierCode(data.ownerId);

    const supplier = await supplierRepo.create({
      ownerId: data.ownerId as any,
      supplierCode,
      name: data.name.trim(),
      companyName: data.companyName?.trim(),
      phone: data.phone?.trim(),
      zalo: data.zalo?.trim(),
      email: data.email?.trim(),
      address: data.address?.trim(),
      taxCode: data.taxCode?.trim(),
      accountNumber: data.accountNumber?.trim(),
      bankName: data.bankName?.trim(),
      notes: data.notes?.trim(),
      status: data.status || 'ACTIVE',
    } as any);

    return supplier;
  }

  async update(id: string, data: Partial<ISupplierDocument>) {
    const supplier = await this.getById(id);
    Object.assign(supplier, data);
    await supplier.save();
    return supplier;
  }

  async delete(id: string) {
    const supplier = await this.getById(id);
    if ((supplier.purchaseCount || 0) > 0) {
      throw new AppError('Không thể xóa nhà cung cấp đã có lịch sử nhập hàng', 400);
    }
    return supplierRepo.deleteById(id);
  }

  /**
   * Returns complete Supplier profile: Details + Purchases + Payments + Debt + Purchased Products
   */
  async getFullProfile(id: string) {
    const supplier = await this.getById(id);

    const [purchasesRes, unitsRes] = await Promise.all([
      purchaseRepo.search({ limit: 100, supplierId: id }),
      unitRepo.search({ limit: 500, supplierId: id }),
    ]);

    const purchases = purchasesRes.data;
    const activePurchases = purchases;

    let totalPurchased = 0;
    let totalPaid = 0;
    let totalDebt = 0;
    const payments: any[] = [];

    for (const p of activePurchases) {
      totalPurchased += p.totalAmount || 0;
      totalPaid += p.paidAmount || 0;
      totalDebt += p.remainingAmount || 0;

      if (p.payments && p.payments.length > 0) {
        p.payments.forEach((pm) => {
          payments.push({
            ...pm,
            purchaseCode: p.purchaseCode,
            purchaseId: p._id,
          });
        });
      }
    }

    // Update supplier metrics
    supplier.totalPurchased = totalPurchased;
    supplier.totalPaid = totalPaid;
    supplier.totalDebt = totalDebt;
    supplier.purchaseCount = activePurchases.length;

    if (activePurchases.length > 0) {
      const dates = activePurchases.map((p) => new Date(p.purchaseDate).getTime());
      supplier.lastPurchaseDate = new Date(Math.max(...dates));
    }

    await supplier.save();

    return {
      supplier,
      purchases: activePurchases,
      payments,
      purchasedUnits: unitsRes.data,
    };
  }
}
