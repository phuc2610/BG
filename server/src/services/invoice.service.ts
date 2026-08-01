import mongoose from 'mongoose';
import { InvoiceRepository, QuoteRepository, CustomerRepository } from '../repositories';
import { generateInvoiceCode, IInvoiceDocument, InventoryUnit, Invoice } from '../models';
import { InvoiceStatus, PaymentMethod, IInvoicePayment, InventoryUnitStatus } from '../types';
import { AppError } from './product.service';
import { CustomerService } from './customer.service';

const invoiceRepo = new InvoiceRepository();
const quoteRepo = new QuoteRepository();
const customerService = new CustomerService();
const customerRepo = new CustomerRepository();

export class InvoiceService {
  async getAll(query: any) {
    return invoiceRepo.search(query);
  }

  async getById(id: string) {
    const invoice = await invoiceRepo.findById(id);
    if (!invoice) throw new AppError('Hóa đơn không tồn tại', 404);
    return invoice;
  }

  async getStats(ownerId?: string) {
    return invoiceRepo.getStats(ownerId);
  }

  /**
   * Creates a new DRAFT Invoice by copying data from a confirmed Quote.
   * Does NOT reduce stock or reserve serials yet.
   */
  async createFromQuote(quoteId: string, createdBy: string = 'Admin', ownerId?: string) {
    const quote = await quoteRepo.findById(quoteId);
    if (!quote) throw new AppError('Báo giá không tồn tại', 404);

    // If invoice already exists for this quote, return existing invoice
    if (quote.invoiceId) {
      const existingInv = await invoiceRepo.findById(quote.invoiceId as any);
      if (existingInv) return existingInv;
    }

    const targetOwnerId = ownerId || (quote.ownerId ? quote.ownerId.toString() : undefined);
    const invoiceCode = await generateInvoiceCode(targetOwnerId);

    let customerId = quote.customerId ? quote.customerId.toString() : undefined;
    if (!customerId && quote.customer && quote.customer.name) {
      try {
        const customerDoc = await customerService.findOrCreateCustomer(quote.customer, createdBy, targetOwnerId);
        customerId = customerDoc._id ? customerDoc._id.toString() : undefined;
      } catch (err) {
        console.error('Error auto-linking customer for invoice:', err);
      }
    }

    // Deep copy quote items (serials initially empty)
    const invoiceItems = (quote.items || []).map((item: any) => {
      let resolvedProdId = item.productId || item.productSnapshot?.productId || item.productSnapshot?._id;
      if (!resolvedProdId && item.inventoryItem) {
        resolvedProdId = typeof item.inventoryItem === 'object' ? (item.inventoryItem._id || item.inventoryItem.product) : item.inventoryItem;
      }
      return {
        inventoryItem: item.inventoryItem,
        productId: resolvedProdId ? resolvedProdId.toString() : undefined,
        productSnapshot: JSON.parse(JSON.stringify(item.productSnapshot || {})),
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        discount: item.discount,
        discountType: item.discountType,
        warranty: item.warranty,
        serialNumber: undefined,
        selectedSerials: [],
        total: item.total,
        order: item.order,
      };
    });

    const invoiceData = {
      ownerId: targetOwnerId as any,
      invoiceCode,
      quoteId: quote._id,
      quoteCode: quote.quoteCode,
      customerId,
      createdDate: new Date(),
      createdBy,
      customer: JSON.parse(JSON.stringify(quote.customer)),
      items: invoiceItems,
      subtotal: quote.subtotal,
      discount: quote.discount,
      discountType: quote.discountType,
      shippingFee: quote.shippingFee,
      vatEnabled: quote.vatEnabled,
      vatPercent: quote.vatPercent,
      vatAmount: quote.vatAmount,
      grandTotal: quote.grandTotal,
      totalCost: quote.totalCost,
      profit: quote.profit,
      totalPaid: 0,
      remainingAmount: quote.grandTotal,
      status: InvoiceStatus.UNPAID,
      isDraft: true,
      isFinalized: false,
      payments: [],
      history: [
        {
          action: 'TẠO_HÓA_ĐƠN_NHÁP',
          description: `Tạo mới hóa đơn nháp ${invoiceCode} từ báo giá gốc ${quote.quoteCode}`,
          performedBy: createdBy,
          createdAt: new Date(),
        },
      ],
      notes: quote.notes,
      showConditionInPdf: quote.showConditionInPdf,
      eInvoiceStatus: 'draft',
    };

    const invoice = await invoiceRepo.create(invoiceData as any);

    // Two-way link back to Quote
    quote.invoiceId = invoice._id as any;
    quote.invoiceCode = invoiceCode;
    await quote.save();

    if (invoice.customerId) {
      await customerService.logActivity(invoice.customerId as any, {
        action: 'TẠO_HÓA_ĐƠN_NHÁP',
        description: `Tạo hóa đơn nháp mới ${invoiceCode} từ báo giá ${quote.quoteCode}`,
        relatedQuoteId: quote._id as any,
        relatedQuoteCode: quote.quoteCode,
        relatedInvoiceId: invoice._id as any,
        relatedInvoiceCode: invoiceCode,
        amount: invoice.grandTotal,
        performedBy: createdBy,
      });
    }

    return invoice;
  }

  /**
   * Selects and reserves serials for a draft invoice item line.
   * Reverts unselected serials to AVAILABLE and sets selected serials to RESERVED.
   */
  async selectSerialsForDraftItem(
    invoiceId: string,
    itemIndex: number,
    selectedSerials: string[]
  ) {
    const invoice = await this.getById(invoiceId);

    if (invoice.isFinalized) {
      throw new AppError('Hóa đơn đã chốt không thể thay đổi danh sách Serial', 400);
    }

    if (!invoice.items || !invoice.items[itemIndex]) {
      throw new AppError('Mục sản phẩm trong hóa đơn không tồn tại', 400);
    }

    const item = invoice.items[itemIndex];
    const requiredQty = item.quantity;

    if (selectedSerials.length > requiredQty) {
      throw new AppError(`Chỉ được chọn tối đa ${requiredQty} Serial cho sản phẩm này`, 400);
    }

    // Previous serials reserved by this invoice line
    const oldSerials = item.selectedSerials || [];

    // Find serials that were unselected (need to release back to AVAILABLE)
    const releasedSerials = oldSerials.filter((s) => !selectedSerials.includes(s));

    if (releasedSerials.length > 0) {
      await InventoryUnit.updateMany(
        { serialNumber: { $in: releasedSerials }, reservedByInvoiceId: invoice._id },
        { status: InventoryUnitStatus.AVAILABLE, reservedByInvoiceId: null, reservedByInvoiceCode: null }
      );
    }

    // Reserve newly selected serials
    if (selectedSerials.length > 0) {
      // Validate that all newly selected serials are AVAILABLE or RESERVED by this invoice
      const units = await InventoryUnit.find({ serialNumber: { $in: selectedSerials } }).exec();
      if (units.length !== selectedSerials.length) {
        throw new AppError('Một số Serial đã chọn không tồn tại trong hệ thống kho', 400);
      }

      for (const u of units) {
        if (
          u.status !== InventoryUnitStatus.AVAILABLE &&
          u.reservedByInvoiceId?.toString() !== invoice._id.toString()
        ) {
          throw new AppError(
            `Serial ${u.serialNumber} hiện không khả dụng (Trạng thái: ${u.status})`,
            400
          );
        }
      }

      // Mark units as RESERVED
      await InventoryUnit.updateMany(
        { serialNumber: { $in: selectedSerials } },
        {
          status: InventoryUnitStatus.RESERVED,
          reservedByInvoiceId: invoice._id,
          reservedByInvoiceCode: invoice.invoiceCode,
        }
      );
    }

    // Save selectedSerials on invoice item
    item.selectedSerials = selectedSerials;
    invoice.history.push({
      action: 'CHỌN_SERIAL_NHÁP',
      description: `Chọn ${selectedSerials.length}/${requiredQty} Serial cho ${item.productSnapshot.name}`,
      performedBy: 'Admin',
      createdAt: new Date(),
    });

    await invoice.save();
    return invoice;
  }

  /**
   * Updates basic fields of a Draft Invoice (Customer, Items, Prices, Discount, Shipping, Payments).
   */
  async updateDraftInvoice(id: string, data: Partial<IInvoiceDocument>) {
    const invoice = await this.getById(id);

    if (invoice.isFinalized) {
      throw new AppError('Hóa đơn đã chốt không thể sửa trực tiếp', 400);
    }

    if (data.customer) invoice.customer = { ...invoice.customer, ...data.customer };
    if (data.items) invoice.items = data.items;
    if (data.subtotal !== undefined) invoice.subtotal = data.subtotal;
    if (data.discount !== undefined) invoice.discount = data.discount;
    if (data.discountType) invoice.discountType = data.discountType;
    if (data.shippingFee !== undefined) invoice.shippingFee = data.shippingFee;
    if (data.vatEnabled !== undefined) invoice.vatEnabled = data.vatEnabled;
    if (data.vatPercent !== undefined) invoice.vatPercent = data.vatPercent;
    if (data.vatAmount !== undefined) invoice.vatAmount = data.vatAmount;
    if (data.grandTotal !== undefined) invoice.grandTotal = data.grandTotal;
    if (data.totalPaid !== undefined) invoice.totalPaid = data.totalPaid;
    if (data.remainingAmount !== undefined) invoice.remainingAmount = data.remainingAmount;
    if (data.dueDate) invoice.dueDate = new Date(data.dueDate);
    if (data.notes !== undefined) invoice.notes = data.notes;

    await invoice.save();
    return invoice;
  }

  /**
   * FINALIZES THE INVOICE (CHỐT HÓA ĐƠN).
   * Validates serials, customer debt due date, and atomically converts InventoryUnits from RESERVED -> SOLD.
   * THIS IS THE ONLY POINT WHERE STOCK IS OFFICIALLY DEDUCTED.
   */
  async finalizeInvoice(
    invoiceId: string,
    data?: {
      paidAmount?: number;
      dueDate?: Date;
      notes?: string;
    }
  ) {
    const invoice = await this.getById(invoiceId);

    if (invoice.isFinalized) {
      throw new AppError('Hóa đơn này đã được chốt trước đó rồi', 400);
    }

    // 1. Validate Serials for all items
    const allSelectedSerials: string[] = [];
    for (let i = 0; i < invoice.items.length; i++) {
      const item = invoice.items[i];
      const selected = item.selectedSerials || [];
      if (selected.length !== item.quantity) {
        throw new AppError(
          `Mục ${i + 1} (${item.productSnapshot.name}): Yêu cầu chọn đúng ${item.quantity} Serial nhưng hiện mới chọn ${selected.length} Serial`,
          400
        );
      }
      allSelectedSerials.push(...selected);
    }

    // 2. Validate Serials in DB are AVAILABLE or RESERVED by this invoice
    const units = await InventoryUnit.find({ serialNumber: { $in: allSelectedSerials } }).exec();
    if (units.length !== allSelectedSerials.length) {
      throw new AppError('Một số Serial đã chọn không tồn tại trong kho', 400);
    }

    for (const u of units) {
      if (
        u.status !== InventoryUnitStatus.AVAILABLE &&
        u.status !== InventoryUnitStatus.RESERVED
      ) {
        throw new AppError(
          `Serial ${u.serialNumber} đã bị xuất bán hoặc không ở trạng thái sẵn sàng (Trạng thái: ${u.status})`,
          400
        );
      }
    }

    // 3. Customer payment & debt validation
    if (data?.paidAmount !== undefined) {
      invoice.totalPaid = Number(data.paidAmount);
      invoice.remainingAmount = Math.max(0, invoice.grandTotal - invoice.totalPaid);
    }

    if (data?.dueDate) {
      invoice.dueDate = new Date(data.dueDate);
    }

    if (invoice.remainingAmount > 0 && !invoice.dueDate) {
      throw new AppError('Khách hàng còn nợ tiền. Vui lòng chọn HẠN THANH TOÁN CÔNG NỢ KHÁCH HÀNG', 400);
    }

    // Set Finalized Status
    const now = new Date();
    invoice.isDraft = false;
    invoice.isFinalized = true;
    invoice.finalizedAt = now;

    if (invoice.remainingAmount <= 0) {
      invoice.status = InvoiceStatus.PAID;
    } else if (invoice.totalPaid > 0) {
      invoice.status = InvoiceStatus.PARTIALLY_PAID;
    } else {
      invoice.status = InvoiceStatus.UNPAID;
    }

    invoice.history.push({
      action: 'CHỐT_HÓA_ĐƠN',
      description: `Xác nhận CHỐT HÓA ĐƠN ${invoice.invoiceCode}. Đã xuất kho ${allSelectedSerials.length} Serial`,
      performedBy: 'Admin',
      createdAt: now,
    });

    // 4. DB Session Transaction / Atomic Update
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Mark InventoryUnits as SOLD
      await InventoryUnit.updateMany(
        { serialNumber: { $in: allSelectedSerials } },
        {
          status: InventoryUnitStatus.SOLD,
          soldInvoiceId: invoice._id,
          soldInvoiceCode: invoice.invoiceCode,
          soldAt: now,
        },
        { session }
      );

      await invoice.save({ session });
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    // 5. Log activity & update customer metrics
    if (invoice.customerId) {
      await customerService.logActivity(invoice.customerId as any, {
        action: 'CHỐT_HÓA_ĐƠN',
        description: `Chốt hóa đơn bán hàng ${invoice.invoiceCode} (${allSelectedSerials.length} Serial)`,
        relatedInvoiceId: invoice._id as any,
        relatedInvoiceCode: invoice.invoiceCode,
        amount: invoice.grandTotal,
        performedBy: 'Admin',
      });
    }

    return invoice;
  }

  /**
   * Adds payment to invoice.
   */
  async addPayment(
    invoiceId: string,
    data: {
      amount: number;
      paymentMethod: PaymentMethod;
      bankName?: string;
      referenceCode?: string;
      notes?: string;
      createdBy?: string;
    }
  ) {
    const invoice = await this.getById(invoiceId);

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new AppError('Không thể thanh toán cho hóa đơn đã bị hủy', 400);
    }

    const amount = Number(data.amount);
    if (!amount || amount <= 0) {
      throw new AppError('Số tiền thanh toán phải lớn hơn 0', 400);
    }

    if (amount > invoice.remainingAmount) {
      throw new AppError(
        `Số tiền thanh toán (${amount.toLocaleString('vi-VN')} đ) vượt quá số tiền còn nợ (${invoice.remainingAmount.toLocaleString('vi-VN')} đ)`,
        400
      );
    }

    const paymentCount = invoice.payments.length + 1;
    const paymentCode = `PT${invoice.invoiceCode.slice(2)}-${String(paymentCount).padStart(2, '0')}`;

    const newPayment: IInvoicePayment = {
      paymentCode,
      amount,
      paymentMethod: data.paymentMethod,
      bankName: data.bankName,
      referenceCode: data.referenceCode,
      paymentDate: new Date(),
      notes: data.notes,
      createdBy: data.createdBy || 'Admin',
    };

    invoice.payments.push(newPayment as any);
    invoice.totalPaid = (invoice.totalPaid || 0) + amount;
    invoice.remainingAmount = Math.max(0, invoice.grandTotal - invoice.totalPaid);

    if (invoice.remainingAmount <= 0) {
      invoice.status = InvoiceStatus.PAID;
    } else {
      invoice.status = InvoiceStatus.PARTIALLY_PAID;
    }

    invoice.history.push({
      action: 'THANH_TOÁN',
      description: `Ghi nhận thanh toán ${amount.toLocaleString('vi-VN')} đ qua ${data.paymentMethod} (${paymentCode})`,
      performedBy: data.createdBy || 'Admin',
      createdAt: new Date(),
    });

    await invoice.save();

    if (invoice.customerId) {
      await customerService.logActivity(invoice.customerId as any, {
        action: 'THANH_TOÁN',
        description: `Thanh toán ${amount.toLocaleString('vi-VN')} đ cho hóa đơn ${invoice.invoiceCode}`,
        relatedInvoiceId: invoice._id as any,
        relatedInvoiceCode: invoice.invoiceCode,
        amount,
      });
    }

    return invoice;
  }

  /**
   * Cancels invoice and releases reserved serials if draft.
   */
  async cancel(id: string, reason?: string) {
    const invoice = await this.getById(id);

    // Release reserved serials back to AVAILABLE
    const reservedSerials: string[] = [];
    for (const item of invoice.items) {
      if (item.selectedSerials) {
        reservedSerials.push(...item.selectedSerials);
      }
    }

    if (reservedSerials.length > 0 && invoice.isDraft) {
      await InventoryUnit.updateMany(
        { serialNumber: { $in: reservedSerials }, reservedByInvoiceId: invoice._id },
        { status: InventoryUnitStatus.AVAILABLE, reservedByInvoiceId: null, reservedByInvoiceCode: null }
      );
    }

    invoice.status = InvoiceStatus.CANCELLED;
    invoice.history.push({
      action: 'HỦY_HÓA_ĐƠN',
      description: `Đã hủy hóa đơn. Lý do: ${reason || 'Không có'}`,
      performedBy: 'Admin',
      createdAt: new Date(),
    });

    await invoice.save();
    return invoice;
  }
}
