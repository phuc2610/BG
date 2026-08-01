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
    ownerId?: string;
    items: Array<{
      productId: string;
      quantity: number;
      costPrice: number;
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

    const purchaseCode = await generatePurchaseCode(data.ownerId);
    const purchaseDate = data.purchaseDate ? new Date(data.purchaseDate) : new Date();

    for (const item of data.items) {
      const product = await productRepo.findById(item.productId);
      if (!product) throw new AppError(`Sản phẩm (ID: ${item.productId}) không tồn tại`, 404);

      const quantity = Number(item.quantity);
      if (!quantity || quantity <= 0) {
        throw new AppError(`Số lượng nhập cho ${product.name} phải lớn hơn 0`, 400);
      }

      const costPrice = Number(item.costPrice);
      if (costPrice < 0) {
        throw new AppError(`Giá nhập cho ${product.name} không hợp lệ`, 400);
      }

      // Parse serials text
      const parsedSerials = this.parseSerials(item.serialsRaw || []);

      if (parsedSerials.length !== quantity) {
        throw new AppError(
          `Sản phẩm ${product.name}: Số lượng nhập là ${quantity} nhưng số Serial nhập vào là ${parsedSerials.length}. Vui lòng kiểm tra lại!`,
          400
        );
      }

      // Check duplicates within the input list itself
      const uniqueSerialsInInput = new Set(parsedSerials);
      if (uniqueSerialsInInput.size !== parsedSerials.length) {
        throw new AppError(`Sản phẩm ${product.name}: Phát hiện Serial bị trùng lặp trong danh sách vừa nhập`, 400);
      }

      // Validate uniqueness across existing DB InventoryUnits
      const existingUnits = await InventoryUnit.find({ serialNumber: { $in: parsedSerials } }).exec();
      if (existingUnits.length > 0) {
        const duplicateSerials = existingUnits.map((u) => u.serialNumber).join(', ');
        throw new AppError(`Serial sau đã tồn tại trong hệ thống kho: ${duplicateSerials}`, 400);
      }

      const warrantyMonths = Number(item.supplierWarrantyMonths) || 12;
      const warrantyEndDate = new Date(purchaseDate.getTime() + warrantyMonths * 30 * 24 * 60 * 60 * 1000);
      const itemTotal = quantity * costPrice;
      totalAmount += itemTotal;

      processedItems.push({
        product: product._id,
        productCode: product.productCode,
        productName: product.name,
        quantity,
        costPrice,
        condition: item.condition || 'Like New',
        supplierWarrantyMonths: warrantyMonths,
        serials: parsedSerials,
        total: itemTotal,
      });

      // Prepare InventoryUnits to bulk insert
      for (const sn of parsedSerials) {
        unitsToCreate.push({
          ownerId: data.ownerId,
          productId: product._id,
          productCode: product.productCode,
          productName: product.name,
          serialNumber: sn,
          purchaseCode,
          supplierId: supplier._id,
          supplierName: supplier.name,
          purchaseDate,
          purchasePrice: costPrice,
          condition: item.condition || 'Like New',
          supplierWarrantyMonths: warrantyMonths,
          supplierWarrantyStartDate: purchaseDate,
          supplierWarrantyEndDate: warrantyEndDate,
          status: InventoryUnitStatus.AVAILABLE,
        });
      }
    }

    const initialPaid = Number(data.paidAmount) || 0;
    const remainingAmount = Math.max(0, totalAmount - initialPaid);

    let status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' = 'UNPAID';
    if (remainingAmount <= 0) {
      status = 'PAID';
    } else if (initialPaid > 0) {
      status = 'PARTIALLY_PAID';
    }

    if (remainingAmount > 0 && !data.dueDate) {
      throw new AppError('Vui lòng chọn hạn thanh toán công nợ NCC cho khoản tiền còn thiếu', 400);
    }

    const initialPayments: any[] = [];
    if (initialPaid > 0) {
      initialPayments.push({
        paymentCode: `PT-${purchaseCode}-01`,
        amount: initialPaid,
        paymentDate: purchaseDate,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        note: 'Thanh toán đợt 1 khi nhập hàng',
      });
    }

    const purchase = await purchaseRepo.create({
      ownerId: data.ownerId as any,
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
      paidAmount: initialPaid,
      remainingAmount,
      dueDate: remainingAmount > 0 ? new Date(data.dueDate!) : undefined,
      status,
      payments: initialPayments,
    } as any);

    // Link purchaseId to units and insert
    for (const u of unitsToCreate) {
      u.purchaseId = purchase._id;
    }
    await InventoryUnit.insertMany(unitsToCreate);

    // Update supplier aggregate stats
    supplier.totalPurchased = (supplier.totalPurchased || 0) + totalAmount;
    supplier.totalPaid = (supplier.totalPaid || 0) + initialPaid;
    supplier.totalDebt = (supplier.totalDebt || 0) + remainingAmount;
    supplier.purchaseCount = (supplier.purchaseCount || 0) + 1;
    supplier.lastPurchaseDate = purchaseDate;
    await supplier.save();

    return purchase;
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
  async getPurchaseStats(startDate?: string, endDate?: string, ownerId?: string): Promise<PurchaseStats> {
    const filter: any = {};
    if (ownerId) filter.ownerId = ownerId;
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
    const availableFilter: any = {
      status: { $in: [InventoryUnitStatus.AVAILABLE, InventoryUnitStatus.RESERVED] },
    };
    if (ownerId) availableFilter.ownerId = ownerId;

    const availableUnits = await InventoryUnit.find(availableFilter).exec();

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
