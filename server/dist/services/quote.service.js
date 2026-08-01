"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuoteService = exports.AppError = void 0;
const repositories_1 = require("../repositories");
const models_1 = require("../models");
const types_1 = require("../types");
const customer_service_1 = require("./customer.service");
const quoteRepo = new repositories_1.QuoteRepository();
const customerService = new customer_service_1.CustomerService();
class AppError extends Error {
    statusCode;
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
    }
}
exports.AppError = AppError;
class QuoteService {
    async getAll(query) {
        return quoteRepo.search(query);
    }
    async getById(id) {
        const quote = await quoteRepo.findById(id);
        if (!quote)
            throw new AppError('Báo giá không tồn tại', 404);
        return quote;
    }
    async create(data) {
        const quoteCode = await (0, models_1.generateQuoteCode)(data.ownerId);
        let customerId;
        if (data.customer && data.customer.name) {
            try {
                const customerDoc = await customerService.findOrCreateCustomer(data.customer, data.createdBy, data.ownerId);
                customerId = customerDoc._id ? customerDoc._id.toString() : undefined;
            }
            catch (err) {
                console.error('Error auto-linking customer for quote:', err);
            }
        }
        const quote = await quoteRepo.create({
            ownerId: data.ownerId,
            quoteCode,
            customerId,
            createdDate: new Date(),
            createdBy: data.createdBy || 'System Admin',
            customer: data.customer,
            items: [],
            subtotal: 0,
            discount: 0,
            discountType: types_1.DiscountType.FIXED,
            shippingFee: 0,
            vatEnabled: false,
            vatPercent: 10,
            vatAmount: 0,
            grandTotal: 0,
            totalCost: 0,
            profit: 0,
            status: types_1.QuoteStatus.DRAFT,
            notes: data.notes || '',
        });
        if (customerId) {
            await customerService.logActivity(customerId, {
                action: 'TẠO_BÁO_GIÁ',
                description: `Lập báo giá mới ${quoteCode}`,
                relatedQuoteId: quote._id,
                relatedQuoteCode: quoteCode,
                amount: quote.grandTotal,
                performedBy: data.createdBy || 'Admin',
            });
        }
        return quote;
    }
    async update(id, data) {
        const quote = await this.getById(id);
        if (data.customer) {
            quote.customer = { ...quote.customer, ...data.customer };
            if (quote.customer && quote.customer.name) {
                try {
                    const customerDoc = await customerService.findOrCreateCustomer(quote.customer, quote.createdBy);
                    quote.customerId = customerDoc._id ? customerDoc._id : undefined;
                }
                catch (err) {
                    console.error('Error auto-linking customer on quote update:', err);
                }
            }
        }
        if (data.discount !== undefined)
            quote.discount = data.discount;
        if (data.discountType)
            quote.discountType = data.discountType;
        if (data.shippingFee !== undefined)
            quote.shippingFee = data.shippingFee;
        if (data.vatEnabled !== undefined)
            quote.vatEnabled = data.vatEnabled;
        if (data.vatPercent !== undefined)
            quote.vatPercent = data.vatPercent;
        if (data.showConditionInPdf !== undefined)
            quote.showConditionInPdf = data.showConditionInPdf;
        if (data.notes !== undefined)
            quote.notes = data.notes;
        const totals = this.calculateTotals(quote.items, quote.discount, quote.discountType, quote.shippingFee, quote.vatEnabled, quote.vatPercent);
        Object.assign(quote, totals);
        await quote.save();
        return quote;
    }
    async delete(id) {
        const quote = await this.getById(id);
        if (quote.status === types_1.QuoteStatus.CONFIRMED) {
            await this.adjustInventory(quote, 'restore');
        }
        return quoteRepo.deleteById(id);
    }
    async addInventoryItem(quoteId, inventoryItemId, unitPrice, quantity = 1, warranty = '12 tháng', serialNumber, conditionOverride) {
        const quote = await this.getById(quoteId);
        let lot = await models_1.Inventory.findById(inventoryItemId).populate('product');
        let productMaster;
        let condition = conditionOverride || 'New';
        let costPrice = 0;
        if (lot) {
            productMaster = lot.product;
            condition = conditionOverride || lot.condition || 'New';
            costPrice = lot.costPrice || 0;
        }
        else {
            productMaster = await models_1.Product.findById(inventoryItemId);
            if (!productMaster)
                throw new AppError('Sản phẩm không tồn tại trong hệ thống', 404);
            condition = conditionOverride || productMaster.condition || 'New';
            costPrice = productMaster.costPrice || productMaster.sellingPrice || 0;
        }
        const itemDiscount = 0;
        const itemTotal = Math.max(0, unitPrice * quantity - itemDiscount);
        const newItem = {
            inventoryItem: (lot?._id || productMaster._id),
            productSnapshot: {
                name: productMaster.name,
                productCode: productMaster.productCode,
                condition: condition,
                costPrice,
                specs: productMaster.specs || {},
                imageUrl: productMaster.images?.[0]?.url,
                serialNumber: serialNumber || undefined,
            },
            unitPrice: unitPrice > 0 ? unitPrice : (productMaster.sellingPrice || 0),
            quantity,
            discount: itemDiscount,
            discountType: types_1.DiscountType.FIXED,
            warranty,
            serialNumber: serialNumber || undefined,
            total: itemTotal,
            order: quote.items.length,
        };
        quote.items.push(newItem);
        const totals = this.calculateTotals(quote.items, quote.discount, quote.discountType, quote.shippingFee, quote.vatEnabled, quote.vatPercent);
        Object.assign(quote, totals);
        await quote.save();
        return quote;
    }
    async removeProduct(quoteId, itemId) {
        const quote = await this.getById(quoteId);
        const itemIndex = quote.items.findIndex((item) => item._id?.toString() === itemId);
        if (itemIndex === -1)
            throw new AppError('Linh kiện không có trong báo giá', 404);
        quote.items.splice(itemIndex, 1);
        quote.items.forEach((item, i) => { item.order = i; });
        const totals = this.calculateTotals(quote.items, quote.discount, quote.discountType, quote.shippingFee, quote.vatEnabled, quote.vatPercent);
        Object.assign(quote, totals);
        await quote.save();
        return quote;
    }
    async updateItem(quoteId, itemId, data) {
        const quote = await this.getById(quoteId);
        const item = quote.items.find((i) => i._id?.toString() === itemId);
        if (!item)
            throw new AppError('Linh kiện không có trong báo giá', 404);
        if (data.unitPrice !== undefined)
            item.unitPrice = data.unitPrice;
        if (data.quantity !== undefined)
            item.quantity = data.quantity;
        if (data.discount !== undefined)
            item.discount = data.discount;
        if (data.discountType)
            item.discountType = data.discountType;
        if (data.warranty !== undefined)
            item.warranty = data.warranty;
        const itemDiscount = item.discountType === types_1.DiscountType.PERCENT
            ? (item.unitPrice * item.quantity * item.discount) / 100
            : item.discount;
        item.total = Math.max(0, item.unitPrice * item.quantity - itemDiscount);
        const totals = this.calculateTotals(quote.items, quote.discount, quote.discountType, quote.shippingFee, quote.vatEnabled, quote.vatPercent);
        Object.assign(quote, totals);
        await quote.save();
        return quote;
    }
    async updateStatus(id, newStatus) {
        const quote = await this.getById(id);
        const oldStatus = quote.status;
        if (oldStatus === newStatus)
            return quote;
        // Note: Per requirements, Quote DOES NOT select serials or reduce/reserve stock.
        // Stock is only reserved/deducted when creating/finalizing an Invoice!
        quote.status = newStatus;
        await quote.save();
        if (quote.customerId) {
            await customerService.logActivity(quote.customerId, {
                action: 'CHUYỂN_TRẠNG_THÁI_BÁO_GIÁ',
                description: `Chuyển trạng thái báo giá ${quote.quoteCode} sang "${newStatus}"`,
                relatedQuoteId: quote._id,
                relatedQuoteCode: quote.quoteCode,
                amount: quote.grandTotal,
                performedBy: 'Admin',
            });
        }
        return quote;
    }
    async adjustInventory(quote, action) {
        const items = quote.items;
        for (const item of items) {
            const lot = await models_1.Inventory.findById(item.inventoryItem);
            if (!lot)
                continue;
            if (action === 'deduct') {
                lot.quantity = Math.max(0, (lot.quantity || 0) - item.quantity);
                lot.isSold = true;
                lot.soldToCustomer = quote.customer ? { ...quote.customer } : undefined;
                lot.soldQuoteId = quote._id;
                lot.soldQuoteCode = quote.quoteCode;
                lot.soldDate = new Date();
                lot.sellingPrice = item.unitPrice;
                lot.soldWarranty = item.warranty;
                // Remove sold serial from serialNumbers array
                if (item.serialNumber && lot.serialNumbers && lot.serialNumbers.length > 0) {
                    lot.serialNumbers = lot.serialNumbers.filter(s => s !== item.serialNumber);
                }
            }
            else {
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
                    if (!lot.serialNumbers)
                        lot.serialNumbers = [];
                    if (!lot.serialNumbers.includes(item.serialNumber)) {
                        lot.serialNumbers.push(item.serialNumber);
                    }
                }
            }
            await lot.save();
        }
    }
    calculateTotals(items, discount, discountType, shippingFee, vatEnabled, vatPercent) {
        // 1. Raw Subtotal before any discount
        const rawSubtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
        // 2. Sum of item-level discounts
        const itemsDiscountTotal = items.reduce((sum, item) => {
            const itemDisc = item.discountType === types_1.DiscountType.PERCENT
                ? (item.unitPrice * item.quantity * item.discount) / 100
                : (item.discount || 0);
            return sum + itemDisc;
        }, 0);
        // 3. Extra overall quote-level discount
        const quoteDiscountTotal = discountType === types_1.DiscountType.PERCENT
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
        const profit = grandTotal - totalCost;
        return {
            subtotal: rawSubtotal,
            vatAmount,
            grandTotal,
            totalCost,
            profit,
        };
    }
}
exports.QuoteService = QuoteService;
//# sourceMappingURL=quote.service.js.map