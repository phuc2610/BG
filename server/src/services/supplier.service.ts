import { SupplierRepository, PurchaseRepository, InventoryUnitRepository } from '../repositories';
import { Supplier, generateSupplierCode, ISupplierDocument, InventoryUnit, Invoice, Purchase } from '../models';
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

  async getStats() {
    return supplierRepo.getStats();
  }

  async create(data: Partial<ISupplier>) {
    if (!data.name || !data.name.trim()) {
      throw new AppError('Tên nhà cung cấp là bắt buộc', 400);
    }

    const supplierCode = await generateSupplierCode();

    const supplier = await supplierRepo.create({
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

  async update(id: string, data: Partial<ISupplier>) {
    const supplier = await this.getById(id);

    if (data.name !== undefined) supplier.name = data.name.trim();
    if (data.companyName !== undefined) supplier.companyName = data.companyName.trim();
    if (data.phone !== undefined) supplier.phone = data.phone.trim();
    if (data.zalo !== undefined) supplier.zalo = data.zalo.trim();
    if (data.email !== undefined) supplier.email = data.email.trim();
    if (data.address !== undefined) supplier.address = data.address.trim();
    if (data.taxCode !== undefined) supplier.taxCode = data.taxCode.trim();
    if (data.accountNumber !== undefined) supplier.accountNumber = data.accountNumber.trim();
    if (data.bankName !== undefined) supplier.bankName = data.bankName.trim();
    if (data.notes !== undefined) supplier.notes = data.notes.trim();

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

  async getFullProfile(id: string) {
    const supplier = await this.getById(id);

    const [purchases, rawUnits] = await Promise.all([
      Purchase.find({ supplierId: id, isDraft: { $ne: true }, status: { $ne: 'DRAFT' } })
        .sort({ purchaseDate: -1 })
        .lean()
        .exec(),
      InventoryUnit.find({ supplierId: id })
        .sort({ purchaseDate: -1 })
        .exec(),
    ]);

    const activePurchases = purchases;

    // 1. Gather all invoice IDs related to these units (sold or reserved)
    const invoiceIds = Array.from(
      new Set(
        [
          ...rawUnits.map((u) => u.soldInvoiceId?.toString()),
          ...rawUnits.map((u) => u.reservedByInvoiceId?.toString()),
        ].filter(Boolean)
      )
    );

    const invoices =
      invoiceIds.length > 0
        ? await Invoice.find({ _id: { $in: invoiceIds } })
            .select('invoiceCode customerId customer createdDate createdBy status isFinalized')
            .lean()
            .exec()
        : [];

    const invoiceMap = new Map((invoices as any[]).map((inv) => [inv._id.toString(), inv]));
    const now = new Date();

    const purchasedUnits = rawUnits.map((u) => {
      const endDate = new Date(u.supplierWarrantyEndDate);
      const diffTime = endDate.getTime() - now.getTime();
      const remainingDays = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;

      let warrantyStatus: 'NORMAL' | 'DUE_SOON' | 'EXPIRED' = 'NORMAL';
      if (remainingDays <= 0) {
        warrantyStatus = 'EXPIRED';
      } else if (remainingDays <= 30) {
        warrantyStatus = 'DUE_SOON';
      }

      const relInvoiceId = u.soldInvoiceId?.toString() || u.reservedByInvoiceId?.toString();
      const inv = relInvoiceId ? invoiceMap.get(relInvoiceId) : null;

      const customerInfo = inv
        ? {
            customerId: inv.customerId ? inv.customerId.toString() : undefined,
            customerName: inv.customer?.name || 'Khách lẻ',
            customerPhone: inv.customer?.phone || '',
            customerEmail: inv.customer?.email || '',
            customerAddress: inv.customer?.address || '',
            invoiceId: inv._id ? inv._id.toString() : undefined,
            invoiceCode: inv.invoiceCode,
            soldAt: u.soldAt || inv.createdDate,
            sellerName: inv.createdBy || 'Admin',
            isFinalized: inv.isFinalized,
          }
        : null;

      return {
        ...u.toObject(),
        remainingWarrantyDays: remainingDays,
        warrantyStatus,
        customerInfo,
      };
    });

    const serialToUnitMap = new Map(
      purchasedUnits.map((u) => [u.serialNumber, u])
    );

    // 2. Enrich each purchase item with serial details
    const enrichedPurchases = activePurchases.map((p: any) => {
      const itemsWithSerials = (p.items || []).map((it: any) => {
        const serialDetails = (it.serials || []).map((sn: string) => {
          return (
            serialToUnitMap.get(sn) || {
              serialNumber: sn,
              status: 'AVAILABLE',
            }
          );
        });
        return {
          ...it,
          serialDetails,
        };
      });

      return {
        ...p,
        items: itemsWithSerials,
      };
    });

    let totalPurchased = 0;
    let totalPaid = 0;
    let totalDebt = 0;
    const payments: any[] = [];

    for (const p of activePurchases) {
      totalPurchased += p.totalAmount || 0;
      totalPaid += p.paidAmount || 0;
      totalDebt += p.remainingAmount || 0;

      if (p.payments && p.payments.length > 0) {
        p.payments.forEach((pm: any) => {
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
      purchases: enrichedPurchases,
      payments,
      purchasedUnits,
    };
  }
}
