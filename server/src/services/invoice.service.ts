import mongoose from 'mongoose';
import { InvoiceRepository, QuoteRepository, CustomerRepository } from '../repositories';
import { generateInvoiceCode, IInvoiceDocument, InventoryUnit, Invoice, Product, Purchase } from '../models';
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

    if (invoice.isFinalized) {
      const { recalculateInvoiceFinancials } = await import('./returnExchange.service');
      await recalculateInvoiceFinancials(invoice);
      await invoice.save();
    }

    return invoice;
  }


  async getStats(startDate?: string, endDate?: string) {
    return invoiceRepo.getStats(startDate, endDate);
  }

  /**
   * Creates a new DRAFT Invoice by copying data from a confirmed Quote.
   * Does NOT reduce stock or reserve serials yet.
   */
  async createFromQuote(quoteId: string, createdBy: string = 'Admin') {
    const quote = await quoteRepo.findById(quoteId);
    if (!quote) throw new AppError('Báo giá không tồn tại', 404);

    // If invoice already exists for this quote, return existing invoice
    if (quote.invoiceId) {
      const existingInv = await invoiceRepo.findById(quote.invoiceId as any);
      if (existingInv) return existingInv;
    }

    const invoiceCode = await generateInvoiceCode();

    let customerId = quote.customerId ? quote.customerId.toString() : undefined;
    if (!customerId && quote.customer && quote.customer.name) {
      try {
        const customerDoc = await customerService.findOrCreateCustomer(quote.customer, createdBy);
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

    // Validate that none of the selectedSerials are already selected by another item in this invoice
    for (let i = 0; i < invoice.items.length; i++) {
      const otherItem = invoice.items[i];
      if (i !== itemIndex && otherItem && Array.isArray(otherItem.selectedSerials)) {
        for (const sn of selectedSerials) {
          if (otherItem.selectedSerials.includes(sn)) {
            throw new AppError(`Serial ${sn} đã được chọn cho một dòng khác trong hóa đơn này`, 400);
          }
        }
      }
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

    // Recalculate totalCost & profit across all invoice lines (serial & non-serial items)
    let draftTotalCost = 0;
    for (const it of invoice.items) {
      const lineSerials = (it.selectedSerials || []).filter((s) => s && s.trim());
      if (lineSerials.length > 0) {
        const selectedUnits = await InventoryUnit.find({ serialNumber: { $in: lineSerials } }).exec();
        const foundCost = selectedUnits.reduce((sum, u) => sum + (u.purchasePrice || 0), 0);
        const missingQty = Math.max(0, it.quantity - selectedUnits.length);
        const fallbackCost = (Number((it.productSnapshot as any)?.costPrice) || 0) * missingQty;
        draftTotalCost += (foundCost + fallbackCost);
      } else {
        const unitCost = Number((it.productSnapshot as any)?.costPrice) || 0;
        draftTotalCost += (unitCost * it.quantity);
      }
    }
    invoice.totalCost = draftTotalCost;
    const netGoodsRevenue = (invoice.grandTotal - (invoice.vatAmount || 0)) - (invoice.shippingFee || 0);
    invoice.profit = netGoodsRevenue - draftTotalCost;

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
   * Validates available stock count for items (with or without serials), customer debt due date,
   * and converts InventoryUnits from AVAILABLE / RESERVED -> SOLD.
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

    const now = new Date();
    const unitsToMarkSold: mongoose.Types.ObjectId[] = [];
    const allExportedSerials: string[] = [];
    const chosenUnitIdsSet = new Set<string>(); // Tracks all units chosen across ALL lines in this invoice
    const allChosenUnitsWithSnapshots: { unit: any; itemSnapshot: any }[] = [];

    // 1. Process each item: Ensure sufficient stock, assign available units (with or without serials)
    for (let i = 0; i < invoice.items.length; i++) {
      const item = invoice.items[i];
      const requiredQty = item.quantity || 1;
      const selectedSerials = (item.selectedSerials || []).filter((s) => s && s.trim());

      let productId = item.productId || (item.productSnapshot as any)?.productId || (item.productSnapshot as any)?._id;

      if (!productId && item.productSnapshot?.productCode) {
        const prodDoc = await Product.findOne({ productCode: item.productSnapshot.productCode }).exec();
        if (prodDoc) productId = prodDoc._id.toString();
      }

      if (!productId) {
        throw new AppError(`Mục ${i + 1} (${item.productSnapshot?.name}): Không tìm thấy ID sản phẩm để xuất kho`, 400);
      }

      // Fetch all AVAILABLE or RESERVED units for this product in stock
      const rawAvailableUnits = await InventoryUnit.find({
        productId,
        $or: [
          { status: InventoryUnitStatus.AVAILABLE },
          { reservedByInvoiceId: invoice._id },
        ],
      }).sort({ serialNumber: -1, createdAt: 1 }).exec();

      // Filter out units that have already been allocated to a preceding line of the same invoice
      const availableUnits = rawAvailableUnits.filter(
        (u) => !chosenUnitIdsSet.has(u._id.toString())
      );

      if (availableUnits.length < requiredQty) {
        throw new AppError(
          `Mục ${i + 1} (${item.productSnapshot?.name}): Không đủ số lượng tồn kho khả dụng để xuất (Tồn khả dụng còn lại: ${availableUnits.length}, Yêu cầu: ${requiredQty})`,
          400
        );
      }

      const chosenUnits: typeof availableUnits = [];

      // A. Match explicitly selected serial numbers first (if user picked specific serials in modal)
      if (selectedSerials.length > 0) {
        for (const sn of selectedSerials) {
          const match = availableUnits.find(
            (u) => u.serialNumber === sn && !chosenUnits.some((c) => (c._id as any).equals(u._id))
          );
          if (!match) {
            throw new AppError(
              `Serial ${sn} của sản phẩm ${item.productSnapshot?.name} không còn ở trạng thái sẵn sàng trong kho`,
              400
            );
          }
          chosenUnits.push(match);
          chosenUnitIdsSet.add(match._id.toString());
        }
      }

      // B. Fill remaining quantity from unchosen available units in stock (whether they have serials or not)
      const remainingNeeded = requiredQty - chosenUnits.length;
      if (remainingNeeded > 0) {
        const unchosenAvailable = availableUnits.filter(
          (u) => !chosenUnits.some((c) => (c._id as any).equals(u._id))
        );
        const fillUnits = unchosenAvailable.slice(0, remainingNeeded);
        for (const u of fillUnits) {
          chosenUnits.push(u);
          chosenUnitIdsSet.add(u._id.toString());
        }
      }

      if (chosenUnits.length < requiredQty) {
        throw new AppError(`Mục ${i + 1} (${item.productSnapshot?.name}): Không tìm đủ đơn vị hàng khả dụng trong kho`, 400);
      }

      // Save chosen unit IDs and serial numbers
      const itemSerials: string[] = [];
      for (const u of chosenUnits) {
        unitsToMarkSold.push(u._id as any);
        allChosenUnitsWithSnapshots.push({ unit: u, itemSnapshot: item.productSnapshot });
        if (u.serialNumber) {
          itemSerials.push(u.serialNumber);
          allExportedSerials.push(u.serialNumber);
        }
      }

      item.selectedSerials = itemSerials;
      if (itemSerials.length > 0) {
        item.serialNumber = itemSerials.join(', ');
      }
    }

    // 2. Calculate actual cost price & profit from chosen physical units
    let actualTotalCost = 0;
    for (const entry of allChosenUnitsWithSnapshots) {
      const u = entry.unit;
      if (u.purchasePrice && u.purchasePrice > 0) {
        actualTotalCost += u.purchasePrice;
      } else {
        const fallbackCost = Number((entry.itemSnapshot as any)?.costPrice) || 0;
        actualTotalCost += fallbackCost;
      }
    }
    invoice.totalCost = actualTotalCost;
    const netGoodsRevenue = (invoice.grandTotal - (invoice.vatAmount || 0)) - (invoice.shippingFee || 0);
    invoice.profit = netGoodsRevenue - actualTotalCost;

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
      description: `Xác nhận CHỐT HÓA ĐƠN ${invoice.invoiceCode}. Đã xuất kho ${unitsToMarkSold.length} đơn vị sản phẩm${allExportedSerials.length > 0 ? ` (${allExportedSerials.length} Serial)` : ''}`,
      performedBy: 'Admin',
      createdAt: now,
    });

    // 4. Update InventoryUnits to SOLD in DB
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (unitsToMarkSold.length > 0) {
        await InventoryUnit.updateMany(
          { _id: { $in: unitsToMarkSold } },
          {
            status: InventoryUnitStatus.SOLD,
            soldInvoiceId: invoice._id,
            soldInvoiceCode: invoice.invoiceCode,
            soldAt: now,
          },
          { session }
        );
      }

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
        description: `Chốt hóa đơn bán hàng ${invoice.invoiceCode} (${unitsToMarkSold.length} SP)`,
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

  /**
   * Retrieves complete purchase origin tracking for all items in an invoice.
   * Handles items with Serial Numbers, items without Serial Numbers (bulk/accessories),
   * and queries matched Purchase Receipts / Inventory Units.
   */
  async getOriginDetails(invoiceId: string) {
    const invoice = await invoiceRepo.findById(invoiceId);
    if (!invoice) throw new AppError('Hóa đơn không tồn tại', 404);

    // 1. Fetch all InventoryUnits linked directly to this invoice (sold or reserved)
    const linkedUnits = await InventoryUnit.find({
      $or: [
        { soldInvoiceId: invoice._id },
        { reservedByInvoiceId: invoice._id },
      ],
    }).lean().exec();

    // 2. Fetch all InventoryUnits matching any selectedSerials in items
    const allSerials = (invoice.items || []).flatMap((it) => it.selectedSerials || []).filter(Boolean);
    const serialUnits = allSerials.length > 0
      ? await InventoryUnit.find({ serialNumber: { $in: allSerials } }).lean().exec()
      : [];

    const combinedUnits = [...linkedUnits, ...serialUnits];
    const unitMapBySerial = new Map<string, any>();
    const unitListByProduct = new Map<string, any[]>();

    for (const u of combinedUnits) {
      if (u.serialNumber) {
        unitMapBySerial.set(u.serialNumber, u);
      }
      const pId = u.productId?.toString();
      if (pId) {
        if (!unitListByProduct.has(pId)) unitListByProduct.set(pId, []);
        const list = unitListByProduct.get(pId)!;
        if (!list.some((existing) => existing._id.toString() === u._id.toString())) {
          list.push(u);
        }
      }
    }

    const now = new Date();
    const assignedUnitIds = new Set<string>();

    // 3. For each invoice item, build origin details
    const itemOrigins: any[] = [];
    for (let idx = 0; idx < invoice.items.length; idx++) {
      const item = invoice.items[idx];
      const pId = item.productId?.toString() || (item.productSnapshot as any)?.productId || (item.productSnapshot as any)?._id?.toString();
      const productCode = item.productSnapshot?.productCode;
      const serials = (item.selectedSerials || []).filter((s) => s && s.trim());
      const neededQty = item.quantity || 1;

      let origins: any[] = [];

      // Case A: Has specific serials
      if (serials.length > 0) {
        for (const sn of serials) {
          const u = unitMapBySerial.get(sn);
          if (u) {
            assignedUnitIds.add(u._id.toString());
            const endDate = u.supplierWarrantyEndDate ? new Date(u.supplierWarrantyEndDate) : null;
            const diffTime = endDate ? endDate.getTime() - now.getTime() : 0;
            const remainingDays = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;

            origins.push({
              sourceType: 'SERIAL',
              serialNumber: u.serialNumber,
              purchaseCode: u.purchaseCode || 'PNK (Chưa gán)',
              supplierName: u.supplierName || 'NCC N/A',
              purchaseDate: u.purchaseDate || u.createdAt,
              purchasePrice: u.purchasePrice || 0,
              listPrice: u.listPrice || 0,
              condition: u.condition || 'New',
              supplierWarrantyMonths: u.supplierWarrantyMonths || 0,
              supplierWarrantyEndDate: u.supplierWarrantyEndDate,
              remainingWarrantyDays: remainingDays,
              quantity: 1,
            });
          } else {
            const rawU = await InventoryUnit.findOne({ serialNumber: sn }).lean().exec();
            if (rawU) {
              assignedUnitIds.add(rawU._id.toString());
              const endDate = rawU.supplierWarrantyEndDate ? new Date(rawU.supplierWarrantyEndDate) : null;
              const diffTime = endDate ? endDate.getTime() - now.getTime() : 0;
              const remainingDays = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;

              origins.push({
                sourceType: 'SERIAL',
                serialNumber: rawU.serialNumber,
                purchaseCode: rawU.purchaseCode || 'PNK (Chưa gán)',
                supplierName: rawU.supplierName || 'NCC N/A',
                purchaseDate: rawU.purchaseDate || rawU.createdAt,
                purchasePrice: rawU.purchasePrice || 0,
                listPrice: rawU.listPrice || 0,
                condition: rawU.condition || 'New',
                supplierWarrantyMonths: rawU.supplierWarrantyMonths || 0,
                supplierWarrantyEndDate: rawU.supplierWarrantyEndDate,
                remainingWarrantyDays: remainingDays,
                quantity: 1,
              });
            } else {
              origins.push({
                sourceType: 'SERIAL',
                serialNumber: sn,
                purchaseCode: 'PNK (Chưa gán)',
                supplierName: 'NCC N/A',
                purchaseDate: invoice.createdDate,
                purchasePrice: 0,
                listPrice: 0,
                condition: 'New',
                quantity: 1,
              });
            }
          }
        }
      }

      // Case B: No serials or origins is empty (e.g. Case, Cooler, Bulk, etc.)
      if (origins.length < neededQty) {
        const remainingNeeded = neededQty - origins.length;
        const linkedForProduct = (pId ? unitListByProduct.get(pId) : []) || [];
        const availableUnitsForLine = linkedForProduct.filter((u) => !assignedUnitIds.has(u._id.toString()));
        const unitsForThisLine = availableUnitsForLine.slice(0, remainingNeeded);

        if (unitsForThisLine.length > 0) {
          for (const u of unitsForThisLine) {
            assignedUnitIds.add(u._id.toString());
            const endDate = u.supplierWarrantyEndDate ? new Date(u.supplierWarrantyEndDate) : null;
            const diffTime = endDate ? endDate.getTime() - now.getTime() : 0;
            const remainingDays = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;

            origins.push({
              sourceType: 'UNIT_NO_SERIAL',
              serialNumber: u.serialNumber || '— (Không dùng S/N)',
              purchaseCode: u.purchaseCode || 'PNK (Chưa gán)',
              supplierName: u.supplierName || 'NCC N/A',
              purchaseDate: u.purchaseDate || u.createdAt,
              purchasePrice: u.purchasePrice || 0,
              listPrice: u.listPrice || 0,
              condition: u.condition || 'New',
              supplierWarrantyMonths: u.supplierWarrantyMonths || 0,
              supplierWarrantyEndDate: u.supplierWarrantyEndDate,
              remainingWarrantyDays: remainingDays,
              quantity: 1,
            });
          }
        }

        if (origins.length < neededQty) {
          // Find recent Purchase receipts for this product
          const queryConditions: any[] = [];
          if (pId && mongoose.Types.ObjectId.isValid(pId)) {
            queryConditions.push({ 'items.product': new mongoose.Types.ObjectId(pId) });
          }
          if (productCode) {
            queryConditions.push({ 'items.productCode': productCode });
          }

          const purchases = queryConditions.length > 0
            ? await Purchase.find({ $or: queryConditions, isDraft: { $ne: true } })
                .sort({ purchaseDate: -1 })
                .limit(5)
                .lean()
                .exec()
            : [];

          if (purchases.length > 0) {
            for (const p of purchases) {
              if (origins.length >= neededQty) break;
              const matchedItem = (p.items || []).find((it: any) =>
                (pId && it.product?.toString() === pId) ||
                (productCode && it.productCode === productCode)
              );
              if (matchedItem) {
                origins.push({
                  sourceType: 'PURCHASE_RECEIPT',
                  serialNumber: '— (Theo phiếu nhập)',
                  purchaseCode: p.purchaseCode,
                  supplierName: p.supplier?.name || p.supplier?.companyName || 'NCC N/A',
                  purchaseDate: p.purchaseDate,
                  purchasePrice: matchedItem.costPrice || 0,
                  listPrice: matchedItem.listPrice || 0,
                  condition: matchedItem.condition || 'New',
                  supplierWarrantyMonths: matchedItem.supplierWarrantyMonths || 0,
                  quantity: 1,
                });
              }
            }
          }
        }
      }

      itemOrigins.push({
        itemIndex: idx,
        productId: pId,
        productCode: item.productSnapshot?.productCode,
        productName: item.productSnapshot?.name,
        quantity: item.quantity,
        origins,
      });
    }

    return itemOrigins;
  }
}
