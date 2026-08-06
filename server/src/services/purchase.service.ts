import { PurchaseRepository, SupplierRepository, InventoryUnitRepository, ProductRepository } from '../repositories';
import { Purchase, generatePurchaseCode, InventoryUnit, Supplier } from '../models';
import { IPurchase, PurchaseFilterQuery, InventoryUnitStatus, PaymentMethod, PurchaseStats } from '../types';
import { AppError } from './product.service';

const purchaseRepo = new PurchaseRepository();
const supplierRepo = new SupplierRepository();
const unitRepo = new InventoryUnitRepository();
const productRepo = new ProductRepository();

export class PurchaseService {
  async getAll(query: PurchaseFilterQuery) {
    return purchaseRepo.search(query);
  }

  async getById(id: string) {
    const purchase = await purchaseRepo.findById(id);
    if (!purchase) throw new AppError('Phiếu nhập hàng không tồn tại', 404);
    return purchase;
  }

  /**
   * Helper to parse and clean raw serial input string (lines/commas/spaces).
   */
  parseSerials(rawSerialInput: string | string[]): string[] {
    if (Array.isArray(rawSerialInput)) {
      return rawSerialInput.map((s) => s.trim()).filter((s) => s.length > 0);
    }
    if (!rawSerialInput || typeof rawSerialInput !== 'string') return [];

    return rawSerialInput
      .split(/[\n,;\t]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  /**
   * Creates a new Purchase Ticket and auto-creates InventoryUnit for every serial.
   */
  async create(data: {
    supplierId: string;
    purchaseDate?: Date;
    notes?: string;
    paidAmount?: number;
    dueDate?: Date;
    isDraft?: boolean;
    items: Array<{
      productId: string;
      quantity: number;
      costPrice: number;
      listPrice?: number;
      condition?: any;
      supplierWarrantyMonths?: number;
      serialsRaw?: string | string[];
    }>;
  }) {
    const supplier = await supplierRepo.findById(data.supplierId);
    if (!supplier) throw new AppError('Vui lòng chọn nhà cung cấp hợp lệ', 400);

    if (!data.items || data.items.length === 0) {
      throw new AppError('Phiếu nhập hàng phải có ít nhất 1 sản phẩm', 400);
    }

    const processedItems: any[] = [];
    let totalAmount = 0;
    const unitsToCreate: any[] = [];

    const purchaseCode = await generatePurchaseCode();
    const purchaseDate = data.purchaseDate ? new Date(data.purchaseDate) : new Date();
    const isDraft = Boolean(data.isDraft);

    for (const item of data.items) {
      const product = await productRepo.findById(item.productId);
      if (!product) throw new AppError(`Sản phẩm (ID: ${item.productId}) không tồn tại`, 404);

      const quantity = Number(item.quantity) || 0;
      const costPrice = Number(item.costPrice) || 0;
      const listPrice = Number((item as any).listPrice) || costPrice;

      const rawWarrantyVal = Number((item as any).supplierWarrantyValue || item.supplierWarrantyMonths) || 12;
      const warrantyUnit = (item as any).supplierWarrantyUnit || 'month';

      let warrantyMonths = rawWarrantyVal;
      let warrantyEndDate = new Date(purchaseDate.getTime());

      if (warrantyUnit === 'day') {
        warrantyEndDate.setDate(warrantyEndDate.getDate() + rawWarrantyVal);
        warrantyMonths = Math.round((rawWarrantyVal / 30) * 10) / 10;
      } else if (warrantyUnit === 'year') {
        warrantyEndDate.setFullYear(warrantyEndDate.getFullYear() + rawWarrantyVal);
        warrantyMonths = rawWarrantyVal * 12;
      } else {
        warrantyEndDate.setMonth(warrantyEndDate.getMonth() + rawWarrantyVal);
        warrantyMonths = rawWarrantyVal;
      }

      // Parse serials text
      const parsedSerials = this.parseSerials(item.serialsRaw || []);

      if (!isDraft) {
        if (quantity <= 0) {
          throw new AppError(`Số lượng nhập cho ${product.name} phải lớn hơn 0`, 400);
        }

        // If serials are provided, validate count matches quantity
        if (parsedSerials.length > 0 && parsedSerials.length !== quantity) {
          throw new AppError(
            `Sản phẩm ${product.name}: Số lượng nhập là ${quantity} nhưng số Serial nhập vào là ${parsedSerials.length}. Vui lòng kiểm tra lại!`,
            400
          );
        }

        // Check duplicates within input
        if (parsedSerials.length > 0) {
          const uniqueSerialsInInput = new Set(parsedSerials);
          if (uniqueSerialsInInput.size !== parsedSerials.length) {
            throw new AppError(`Sản phẩm ${product.name}: Phát hiện Serial bị trùng lặp trong danh sách vừa nhập`, 400);
          }

          // Validate DB uniqueness
          const existingUnits = await InventoryUnit.find({ serialNumber: { $in: parsedSerials } }).exec();
          if (existingUnits.length > 0) {
            const duplicateSerials = existingUnits.map((u) => u.serialNumber).join(', ');
            throw new AppError(`Serial sau đã tồn tại trong hệ thống kho: ${duplicateSerials}`, 400);
          }
        }
      }

      const itemTotal = quantity * costPrice;
      totalAmount += itemTotal;

      processedItems.push({
        product: product._id,
        productCode: product.productCode,
        productName: product.name,
        quantity,
        costPrice,
        listPrice,
        condition: item.condition || 'Like New',
        supplierWarrantyMonths: warrantyMonths,
        supplierWarrantyValue: rawWarrantyVal,
        supplierWarrantyUnit: warrantyUnit,
        serials: parsedSerials,
        total: itemTotal,
      });

      if (!isDraft) {
        // Sync master Product catalog sellingPrice with imported listPrice
        if (listPrice && listPrice > 0) {
          product.sellingPrice = listPrice;
          await product.save();
        }

        if (parsedSerials.length > 0) {
          // Create one InventoryUnit per serial
          for (const sn of parsedSerials) {
            unitsToCreate.push({
              productId: product._id,
              productCode: product.productCode,
              productName: product.name,
              serialNumber: sn,
              purchaseCode,
              supplierId: supplier._id,
              supplierName: supplier.name,
              purchaseDate,
              purchasePrice: costPrice,
              listPrice,
              condition: item.condition || 'Like New',
              supplierWarrantyMonths: warrantyMonths,
              supplierWarrantyStartDate: purchaseDate,
              supplierWarrantyEndDate: warrantyEndDate,
              status: InventoryUnitStatus.AVAILABLE,
            });
          }
        } else {
          // No serials provided — create one InventoryUnit per unit of quantity
          for (let q = 0; q < quantity; q++) {
            unitsToCreate.push({
              productId: product._id,
              productCode: product.productCode,
              productName: product.name,
              serialNumber: undefined,
              purchaseCode,
              supplierId: supplier._id,
              supplierName: supplier.name,
              purchaseDate,
              purchasePrice: costPrice,
              listPrice,
              condition: item.condition || 'Like New',
              supplierWarrantyMonths: warrantyMonths,
              supplierWarrantyStartDate: purchaseDate,
              supplierWarrantyEndDate: warrantyEndDate,
              status: InventoryUnitStatus.AVAILABLE,
            });
          }
        }
      }
    }

    const initialPaid = Number(data.paidAmount) || 0;
    const remainingAmount = Math.max(0, totalAmount - initialPaid);

    let status: 'DRAFT' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' = 'UNPAID';
    if (isDraft) {
      status = 'DRAFT';
    } else if (remainingAmount <= 0) {
      status = 'PAID';
    } else if (initialPaid > 0) {
      status = 'PARTIALLY_PAID';
    }

    if (!isDraft && remainingAmount > 0 && !data.dueDate) {
      throw new AppError('Vui lòng chọn hạn thanh toán công nợ NCC cho khoản tiền còn thiếu', 400);
    }

    const initialPayments: any[] = [];
    if (!isDraft && initialPaid > 0) {
      initialPayments.push({
        paymentCode: `PT-${purchaseCode}-01`,
        amount: initialPaid,
        paymentDate: purchaseDate,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        note: 'Thanh toán đợt 1 khi nhập hàng',
      });
    }

    const purchase = await purchaseRepo.create({
      purchaseCode,
      supplierId: supplier._id as any,
      supplier: {
        name: supplier.name,
        companyName: supplier.companyName,
        phone: supplier.phone,
      },
      purchaseDate,
      notes: data.notes?.trim() || '',
      items: processedItems,
      totalAmount,
      paidAmount: isDraft ? 0 : initialPaid,
      remainingAmount: isDraft ? 0 : remainingAmount,
      dueDate: (!isDraft && remainingAmount > 0) ? new Date(data.dueDate!) : undefined,
      isDraft,
      status,
      payments: initialPayments,
    } as any);

    if (!isDraft && unitsToCreate.length > 0) {
      try {
        for (const u of unitsToCreate) {
          u.purchaseId = purchase._id;
        }
        await InventoryUnit.insertMany(unitsToCreate);

        // Update supplier stats
        supplier.totalPurchased = (supplier.totalPurchased || 0) + totalAmount;
        supplier.totalPaid = (supplier.totalPaid || 0) + initialPaid;
        supplier.totalDebt = (supplier.totalDebt || 0) + remainingAmount;
        supplier.purchaseCount = (supplier.purchaseCount || 0) + 1;
        supplier.lastPurchaseDate = purchaseDate;
        await supplier.save();
      } catch (err: any) {
        // Rollback purchase record if inventory insertion fails
        await Purchase.findByIdAndDelete(purchase._id);
        throw new AppError(`Lỗi khi tạo kho sản phẩm: ${err.message}`, 500);
      }
    }

    return purchase;
  }

  async updateDraft(id: string, data: any) {
    return this.updatePurchase(id, data);
  }

  async updatePurchase(id: string, data: any) {
    const purchase = await Purchase.findById(id);
    if (!purchase) throw new AppError('Phiếu nhập hàng không tồn tại', 404);

    // If it's a draft, just recreate
    if (purchase.isDraft || purchase.status === 'DRAFT') {
      await Purchase.findByIdAndDelete(id);
      return this.create(data);
    }

    // Official purchase — check if any InventoryUnits from this purchase have been exported / sold / reserved
    const existingUnits = await InventoryUnit.find({ purchaseId: purchase._id }).exec();
    const exportedUnits = existingUnits.filter(
      (u) =>
        u.status === InventoryUnitStatus.SOLD ||
        u.status === InventoryUnitStatus.RESERVED ||
        Boolean(u.soldInvoiceId) ||
        Boolean(u.reservedByInvoiceId)
    );

    if (exportedUnits.length > 0) {
      throw new AppError(
        `Không thể sửa phiếu nhập ${purchase.purchaseCode} vì đã có ${exportedUnits.length} sản phẩm được xuất bán trong Hóa Đơn chính thức.`,
        400
      );
    }

    // Revert old supplier stats if official purchase
    const oldSupplier = await supplierRepo.findById(purchase.supplierId.toString());
    if (oldSupplier) {
      oldSupplier.totalPurchased = Math.max(0, (oldSupplier.totalPurchased || 0) - (purchase.totalAmount || 0));
      oldSupplier.totalPaid = Math.max(0, (oldSupplier.totalPaid || 0) - (purchase.paidAmount || 0));
      oldSupplier.totalDebt = Math.max(0, (oldSupplier.totalDebt || 0) - (purchase.remainingAmount || 0));
      oldSupplier.purchaseCount = Math.max(0, (oldSupplier.purchaseCount || 0) - 1);
      await oldSupplier.save();
    }

    // Delete old InventoryUnits for this purchase
    await InventoryUnit.deleteMany({ purchaseId: purchase._id });

    // Delete old purchase record
    await Purchase.findByIdAndDelete(id);

    // Re-create updated purchase preserving purchaseCode
    const updatedPurchase = await this.create({
      ...data,
      purchaseCode: purchase.purchaseCode,
    } as any);

    return updatedPurchase;
  }

  async deleteDraft(id: string) {
    const purchase = await Purchase.findById(id);
    if (!purchase) throw new AppError('Phiếu nhập không tồn tại', 404);

    if (!purchase.isDraft && purchase.status !== 'DRAFT') {
      throw new AppError('Không thể xóa phiếu nhập hàng đã nhập kho chính thức', 400);
    }

    await Purchase.findByIdAndDelete(id);
    return { message: 'Đã xóa phiếu nhập lưu tạm thành công' };
  }

  /**
   * Add a payment record to a purchase ticket to pay off supplier debt.
   */
  async addPayment(
    purchaseId: string,
    data: {
      amount: number;
      paymentMethod: PaymentMethod;
      bankName?: string;
      referenceCode?: string;
      note?: string;
    }
  ) {
    const purchase = await this.getById(purchaseId);

    const amount = Number(data.amount);
    if (!amount || amount <= 0) {
      throw new AppError('Số tiền thanh toán phải lớn hơn 0', 400);
    }

    if (amount > purchase.remainingAmount) {
      throw new AppError(
        `Số tiền thanh toán (${amount.toLocaleString('vi-VN')} đ) vượt quá số tiền còn nợ (${purchase.remainingAmount.toLocaleString('vi-VN')} đ)`,
        400
      );
    }

    const count = (purchase.payments || []).length + 1;
    const paymentCode = `PT-${purchase.purchaseCode}-${String(count).padStart(2, '0')}`;

    const newPayment = {
      paymentCode,
      amount,
      paymentDate: new Date(),
      paymentMethod: data.paymentMethod,
      bankName: data.bankName,
      referenceCode: data.referenceCode,
      note: data.note,
    };

    purchase.payments.push(newPayment as any);
    purchase.paidAmount = (purchase.paidAmount || 0) + amount;
    purchase.remainingAmount = Math.max(0, purchase.totalAmount - purchase.paidAmount);

    if (purchase.remainingAmount <= 0) {
      purchase.status = 'PAID';
    } else {
      purchase.status = 'PARTIALLY_PAID';
    }

    await purchase.save();

    // Update supplier model debt
    const supplier = await supplierRepo.findById(purchase.supplierId as any);
    if (supplier) {
      supplier.totalPaid = (supplier.totalPaid || 0) + amount;
      supplier.totalDebt = Math.max(0, (supplier.totalDebt || 0) - amount);
      await supplier.save();
    }

    return purchase;
  }

  /**
   * Calculates overall Purchase Financial Dashboard statistics.
   */
  async getPurchaseStats(startDate?: string, endDate?: string): Promise<PurchaseStats> {
    const filter: any = {
      isDraft: { $ne: true },
      status: { $ne: 'DRAFT' },
    };
    if (startDate || endDate) {
      filter.purchaseDate = {};
      if (startDate) filter.purchaseDate.$gte = new Date(startDate);
      if (endDate) filter.purchaseDate.$lte = new Date(endDate);
    }

    const purchases = await Purchase.find(filter).exec();
    const now = new Date();

    let totalPurchasesAmount = 0;
    let totalPaidSuppliers = 0;
    let totalRemainingDebt = 0;
    let totalOverdueDebt = 0;

    for (const p of purchases) {
      totalPurchasesAmount += p.totalAmount || 0;
      totalPaidSuppliers += p.paidAmount || 0;
      totalRemainingDebt += p.remainingAmount || 0;

      if (p.remainingAmount > 0 && p.dueDate && new Date(p.dueDate) < now) {
        totalOverdueDebt += p.remainingAmount;
      }
    }

    // Valuation of stock currently in warehouse at actual purchase price (AVAILABLE or RESERVED units)
    const availableUnits = await InventoryUnit.find({
      status: { $in: [InventoryUnitStatus.AVAILABLE, InventoryUnitStatus.RESERVED] },
    }).exec();

    const currentStockValuation = availableUnits.reduce((sum, u) => sum + (u.purchasePrice || 0), 0);

    return {
      totalPurchasesAmount,
      totalPaidSuppliers,
      totalRemainingDebt,
      totalOverdueDebt,
      currentStockValuation,
    };
  }
}
