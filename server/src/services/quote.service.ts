import { QuoteRepository } from '../repositories';
import { Inventory, Product, generateQuoteCode, IQuoteDocument } from '../models';
import { QuoteStatus, DiscountType, IQuoteItem } from '../types';
import { CustomerService } from './customer.service';

const quoteRepo = new QuoteRepository();
const customerService = new CustomerService();

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class QuoteService {
  async getAll(query: any) {
    return quoteRepo.search(query);
  }

  async getById(id: string) {
    const quote = await quoteRepo.findById(id);
    if (!quote) throw new AppError('Báo giá không tồn tại', 404);
    return quote;
  }

  async create(data: {
    customer: {
      name: string;
      phone?: string;
      email?: string;
      address?: string;
      notes?: string;
    };
    createdBy?: string;
    notes?: string;
  }) {
    const quoteCode = await generateQuoteCode();

    let customerId: string | undefined = (data as any).customerId || (data.customer as any)?._id || (data.customer as any)?.id;
    if (data.customer && data.customer.name) {
      try {
        const customerDoc = await customerService.findOrCreateCustomer({
          ...data.customer,
          _id: customerId as any,
        }, data.createdBy);
        customerId = customerDoc._id ? customerDoc._id.toString() : customerId;
        data.customer = {
          _id: customerDoc._id,
          customerCode: customerDoc.customerCode,
          name: customerDoc.name,
          phone: customerDoc.phone,
          email: customerDoc.email,
          address: customerDoc.address,
          companyName: customerDoc.companyName,
          notes: customerDoc.notes,
        } as any;
      } catch (err) {
        console.error('Error auto-linking customer for quote:', err);
      }
    }

    const quote = await quoteRepo.create({
      quoteCode,
      customerId,
      createdDate: new Date(),
      createdBy: data.createdBy || 'System Admin',
      customer: data.customer,
      items: [],
      subtotal: 0,
      discount: 0,
      discountType: DiscountType.FIXED,
      shippingFee: 0,
      vatEnabled: false,
      vatPercent: 10,
      vatAmount: 0,
      grandTotal: 0,
      totalCost: 0,
      profit: 0,
      status: QuoteStatus.DRAFT,
      notes: data.notes || '',
    } as any);

    if (customerId) {
      await customerService.logActivity(customerId, {
        action: 'TẠO_BÁO_GIÁ',
        description: `Lập báo giá mới ${quoteCode}`,
        relatedQuoteId: quote._id as any,
        relatedQuoteCode: quoteCode,
        amount: quote.grandTotal,
        performedBy: data.createdBy || 'Admin',
      });
    }

    return quote;
  }

  async update(id: string, data: Partial<IQuoteDocument>) {
    const quote = await this.getById(id);

    if (data.customer) {
      quote.customer = { ...quote.customer, ...data.customer };
      if (quote.customer && quote.customer.name) {
        try {
          const customerDoc = await customerService.findOrCreateCustomer(quote.customer, quote.createdBy);
          quote.customerId = customerDoc._id ? (customerDoc._id as any) : undefined;
        } catch (err) {
          console.error('Error auto-linking customer on quote update:', err);
        }
      }
    }
    if (data.discount !== undefined) quote.discount = data.discount;
    if (data.discountType) quote.discountType = data.discountType;
    if (data.shippingFee !== undefined) quote.shippingFee = data.shippingFee;
    if (data.vatEnabled !== undefined) quote.vatEnabled = data.vatEnabled;
    if (data.vatPercent !== undefined) quote.vatPercent = data.vatPercent;
    if (data.showConditionInPdf !== undefined) quote.showConditionInPdf = data.showConditionInPdf;
    if (data.notes !== undefined) quote.notes = data.notes;

    const totals = this.calculateTotals(
      quote.items as any,
      quote.discount,
      quote.discountType,
      quote.shippingFee,
      quote.vatEnabled,
      quote.vatPercent
    );

    Object.assign(quote, totals);
    await quote.save();
    return quote;
  }

  async delete(id: string) {
    const quote = await this.getById(id);
    if (quote.status === QuoteStatus.CONFIRMED) {
      await this.adjustInventory(quote, 'restore');
    }
    return quoteRepo.deleteById(id);
  }

  async addInventoryItem(
    quoteId: string,
    inventoryItemId: string,
    unitPrice: number,
    quantity: number = 1,
    warranty: string = '12 tháng',
    serialNumber?: string,
    conditionOverride?: string
  ) {
    const quote = await this.getById(quoteId);

    let lot = await Inventory.findById(inventoryItemId).populate('product');
    let productMaster: any;
    let condition = conditionOverride || 'New';
    let costPrice = 0;

    if (lot) {
      productMaster = lot.product;
      condition = conditionOverride || lot.condition || 'New';
      costPrice = lot.costPrice || 0;
    } else {
      productMaster = await Product.findById(inventoryItemId);
      if (!productMaster) throw new AppError('Sản phẩm không tồn tại trong hệ thống', 404);
      condition = conditionOverride || productMaster.condition || 'New';
      costPrice = productMaster.costPrice || productMaster.sellingPrice || 0;
    }

    const itemDiscount = 0;
    const itemTotal = Math.max(0, unitPrice * quantity - itemDiscount);

    const newItem: Partial<IQuoteItem> = {
      inventoryItem: (lot?._id || productMaster._id) as any,
      productSnapshot: {
        name: productMaster.name,
        productCode: productMaster.productCode,
        brand: productMaster.brand || '',
        condition: condition as any,
        costPrice,
        specs: productMaster.specs || {},
        imageUrl: productMaster.images?.[0]?.url,
        serialNumber: serialNumber || undefined,
      },
      unitPrice: unitPrice > 0 ? unitPrice : (productMaster.sellingPrice || 0),
      quantity,
      discount: itemDiscount,
      discountType: DiscountType.FIXED,
      warranty,
      serialNumber: serialNumber || undefined,
      total: itemTotal,
      order: quote.items.length,
    };

    quote.items.push(newItem as any);

    const totals = this.calculateTotals(
      quote.items as any,
      quote.discount,
      quote.discountType,
      quote.shippingFee,
      quote.vatEnabled,
      quote.vatPercent
    );

    Object.assign(quote, totals);
    await quote.save();
    return quote;
  }

  async removeProduct(quoteId: string, itemId: string) {
    const quote = await this.getById(quoteId);
    const itemIndex = quote.items.findIndex(
      (item: any) => item._id?.toString() === itemId
    );
    if (itemIndex === -1) throw new AppError('Linh kiện không có trong báo giá', 404);

    quote.items.splice(itemIndex, 1);
    quote.items.forEach((item, i) => { item.order = i; });

    const totals = this.calculateTotals(
      quote.items as any,
      quote.discount,
      quote.discountType,
      quote.shippingFee,
      quote.vatEnabled,
      quote.vatPercent
    );

    Object.assign(quote, totals);
    await quote.save();
    return quote;
  }

  async updateItem(quoteId: string, itemId: string, data: {
    unitPrice?: number;
    quantity?: number;
    discount?: number;
    discountType?: DiscountType;
    warranty?: string;
  }) {
    const quote = await this.getById(quoteId);
    const item = quote.items.find((i: any) => i._id?.toString() === itemId);
    if (!item) throw new AppError('Linh kiện không có trong báo giá', 404);

    if (data.unitPrice !== undefined) item.unitPrice = data.unitPrice;
    if (data.quantity !== undefined) item.quantity = data.quantity;
    if (data.discount !== undefined) item.discount = data.discount;
    if (data.discountType) item.discountType = data.discountType;
    if (data.warranty !== undefined) item.warranty = data.warranty;

    const itemDiscount = item.discountType === DiscountType.PERCENT
      ? (item.unitPrice * item.quantity * item.discount) / 100
      : item.discount;

    item.total = Math.max(0, item.unitPrice * item.quantity - itemDiscount);

    const totals = this.calculateTotals(
      quote.items as any,
      quote.discount,
      quote.discountType,
      quote.shippingFee,
      quote.vatEnabled,
      quote.vatPercent
    );

    Object.assign(quote, totals);
    await quote.save();
    return quote;
  }

  async updateStatus(id: string, newStatus: QuoteStatus) {
    const quote = await this.getById(id);
    const oldStatus = quote.status;

    if (oldStatus === newStatus) return quote;

    // Note: Per requirements, Quote DOES NOT select serials or reduce/reserve stock.
    // Stock is only reserved/deducted when creating/finalizing an Invoice!
    quote.status = newStatus;
    await quote.save();

    if (quote.customerId) {
      await customerService.logActivity(quote.customerId as any, {
        action: 'CHUYỂN_TRẠNG_THÁI_BÁO_GIÁ',
        description: `Chuyển trạng thái báo giá ${quote.quoteCode} sang "${newStatus}"`,
        relatedQuoteId: quote._id as any,
        relatedQuoteCode: quote.quoteCode,
        amount: quote.grandTotal,
        performedBy: 'Admin',
      });
    }

    return quote;
  }

  private async adjustInventory(quote: IQuoteDocument, action: 'deduct' | 'restore') {
    const items = quote.items as any[];
    for (const item of items) {
      const lot = await Inventory.findById(item.inventoryItem as any);
      if (!lot) continue;

      if (action === 'deduct') {
        lot.quantity = Math.max(0, (lot.quantity || 0) - item.quantity);
        lot.isSold = true;
        lot.soldToCustomer = quote.customer ? { ...quote.customer } : undefined;
        lot.soldQuoteId = quote._id as any;
        lot.soldQuoteCode = quote.quoteCode;
        lot.soldDate = new Date();
        lot.sellingPrice = item.unitPrice;
        lot.soldWarranty = item.warranty;

        // Remove sold serial from serialNumbers array
        if (item.serialNumber && lot.serialNumbers && lot.serialNumbers.length > 0) {
          lot.serialNumbers = lot.serialNumbers.filter(s => s !== item.serialNumber);
        }
      } else {
        lot.quantity = (lot.quantity || 0) + item.quantity;
        lot.isSold = false;
        lot.soldToCustomer = undefined;
        lot.soldQuoteId = undefined;
        lot.soldQuoteCode = undefined;
        lot.soldDate = undefined;
        lot.sellingPrice = undefined;
        lot.soldWarranty = undefined;

        // Restore serial back to serialNumbers array
        if (item.serialNumber) {
          if (!lot.serialNumbers) lot.serialNumbers = [];
          if (!lot.serialNumbers.includes(item.serialNumber)) {
            lot.serialNumbers.push(item.serialNumber);
          }
        }
      }
      await lot.save();
    }
  }

  private calculateTotals(
    items: IQuoteItem[],
    discount: number,
    discountType: DiscountType,
    shippingFee: number,
    vatEnabled: boolean,
    vatPercent: number
  ) {
    // 1. Raw Subtotal before any discount
    const rawSubtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

    // 2. Sum of item-level discounts
    const itemsDiscountTotal = items.reduce((sum, item) => {
      const itemDisc = item.discountType === DiscountType.PERCENT
        ? (item.unitPrice * item.quantity * item.discount) / 100
        : (item.discount || 0);
      return sum + itemDisc;
    }, 0);

    // 3. Extra overall quote-level discount
    const quoteDiscountTotal = discountType === DiscountType.PERCENT
      ? ((rawSubtotal - itemsDiscountTotal) * discount) / 100
      : (discount || 0);

    // 4. Combined total discount
    const totalDiscountAmount = itemsDiscountTotal + quoteDiscountTotal;

    // 5. Total Cost
    const totalCost = items.reduce((sum, item) => {
      const cost = item.productSnapshot?.costPrice || 0;
      return sum + (cost * item.quantity);
    }, 0);

    const afterDiscount = Math.max(0, rawSubtotal - totalDiscountAmount);
    const vatAmount = vatEnabled ? (afterDiscount * vatPercent) / 100 : 0;
    const grandTotal = afterDiscount + shippingFee + vatAmount;
    const profit = (grandTotal - vatAmount) - totalCost;

    return {
      subtotal: rawSubtotal,
      vatAmount,
      grandTotal,
      totalCost,
      profit,
    };
  }
}
