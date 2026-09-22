"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const repositories_1 = require("../repositories");
const models_1 = require("../models");
const types_1 = require("../types");
const product_service_1 = require("./product.service");
const customer_service_1 = require("./customer.service");
const invoiceRepo = new repositories_1.InvoiceRepository();
const quoteRepo = new repositories_1.QuoteRepository();
const customerService = new customer_service_1.CustomerService();
const customerRepo = new repositories_1.CustomerRepository();
class InvoiceService {
    async getAll(query) {
        return invoiceRepo.search(query);
    }
    async getById(id) {
        const invoice = await invoiceRepo.findById(id);
        if (!invoice)
            throw new product_service_1.AppError('Hóa đơn không tồn tại', 404);
        if (invoice.isFinalized) {
            const { recalculateInvoiceFinancials } = await Promise.resolve().then(() => __importStar(require('./returnExchange.service')));
            await recalculateInvoiceFinancials(invoice);
            await invoice.save();
        }
        return invoice;
    }
    async getStats(startDate, endDate) {
        return invoiceRepo.getStats(startDate, endDate);
    }
    /**
     * Creates a new DRAFT Invoice by copying data from a confirmed Quote.
     * Does NOT reduce stock or reserve serials yet.
     */
    async createFromQuote(quoteId, createdBy = 'Admin') {
        const quote = await quoteRepo.findById(quoteId);
        if (!quote)
            throw new product_service_1.AppError('Báo giá không tồn tại', 404);
        // If invoice already exists for this quote, return existing invoice
        if (quote.invoiceId) {
            const existingInv = await invoiceRepo.findById(quote.invoiceId);
            if (existingInv)
                return existingInv;
        }
        const invoiceCode = await (0, models_1.generateInvoiceCode)();
        let customerId = quote.customerId ? quote.customerId.toString() : undefined;
        if (!customerId && quote.customer && quote.customer.name) {
            try {
                const customerDoc = await customerService.findOrCreateCustomer(quote.customer, createdBy);
                customerId = customerDoc._id ? customerDoc._id.toString() : undefined;
            }
            catch (err) {
                console.error('Error auto-linking customer for invoice:', err);
            }
        }
        // Deep copy quote items (serials initially empty)
        const invoiceItems = (quote.items || []).map((item) => {
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
            status: types_1.InvoiceStatus.UNPAID,
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
        const invoice = await invoiceRepo.create(invoiceData);
        // Two-way link back to Quote
        quote.invoiceId = invoice._id;
        quote.invoiceCode = invoiceCode;
        await quote.save();
        if (invoice.customerId) {
            await customerService.logActivity(invoice.customerId, {
                action: 'TẠO_HÓA_ĐƠN_NHÁP',
                description: `Tạo hóa đơn nháp mới ${invoiceCode} từ báo giá ${quote.quoteCode}`,
                relatedQuoteId: quote._id,
                relatedQuoteCode: quote.quoteCode,
                relatedInvoiceId: invoice._id,
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
    async selectSerialsForDraftItem(invoiceId, itemIndex, selectedSerials) {
        const invoice = await this.getById(invoiceId);
        if (invoice.isFinalized) {
            throw new product_service_1.AppError('Hóa đơn đã chốt không thể thay đổi danh sách Serial', 400);
        }
        if (!invoice.items || !invoice.items[itemIndex]) {
            throw new product_service_1.AppError('Mục sản phẩm trong hóa đơn không tồn tại', 400);
        }
        const item = invoice.items[itemIndex];
        const requiredQty = item.quantity;
        if (selectedSerials.length > requiredQty) {
            throw new product_service_1.AppError(`Chỉ được chọn tối đa ${requiredQty} Serial cho sản phẩm này`, 400);
        }
        // Validate that none of the selectedSerials are already selected by another item in this invoice
        for (let i = 0; i < invoice.items.length; i++) {
            const otherItem = invoice.items[i];
            if (i !== itemIndex && otherItem && Array.isArray(otherItem.selectedSerials)) {
                for (const sn of selectedSerials) {
                    if (otherItem.selectedSerials.includes(sn)) {
                        throw new product_service_1.AppError(`Serial ${sn} đã được chọn cho một dòng khác trong hóa đơn này`, 400);
                    }
                }
            }
        }
        // Previous serials reserved by this invoice line
        const oldSerials = item.selectedSerials || [];
        // Find serials that were unselected (need to release back to AVAILABLE)
        const releasedSerials = oldSerials.filter((s) => !selectedSerials.includes(s));
        if (releasedSerials.length > 0) {
            await models_1.InventoryUnit.updateMany({ serialNumber: { $in: releasedSerials }, reservedByInvoiceId: invoice._id }, { status: types_1.InventoryUnitStatus.AVAILABLE, reservedByInvoiceId: null, reservedByInvoiceCode: null });
        }
        // Reserve newly selected serials
        if (selectedSerials.length > 0) {
            // Validate that all newly selected serials are AVAILABLE or RESERVED by this invoice
            const units = await models_1.InventoryUnit.find({ serialNumber: { $in: selectedSerials } }).exec();
            if (units.length !== selectedSerials.length) {
                throw new product_service_1.AppError('Một số Serial đã chọn không tồn tại trong hệ thống kho', 400);
            }
            for (const u of units) {
                if (u.status !== types_1.InventoryUnitStatus.AVAILABLE &&
                    u.reservedByInvoiceId?.toString() !== invoice._id.toString()) {
                    throw new product_service_1.AppError(`Serial ${u.serialNumber} hiện không khả dụng (Trạng thái: ${u.status})`, 400);
                }
            }
            // Mark units as RESERVED
            await models_1.InventoryUnit.updateMany({ serialNumber: { $in: selectedSerials } }, {
                status: types_1.InventoryUnitStatus.RESERVED,
                reservedByInvoiceId: invoice._id,
                reservedByInvoiceCode: invoice.invoiceCode,
            });
        }
        // Save selectedSerials on invoice item
        item.selectedSerials = selectedSerials;
        // Recalculate totalCost & profit across all invoice lines (serial & non-serial items)
        let draftTotalCost = 0;
        for (const it of invoice.items) {
            const lineSerials = (it.selectedSerials || []).filter((s) => s && s.trim());
            if (lineSerials.length > 0) {
                const selectedUnits = await models_1.InventoryUnit.find({ serialNumber: { $in: lineSerials } }).exec();
                const foundCost = selectedUnits.reduce((sum, u) => sum + (u.purchasePrice || 0), 0);
                const missingQty = Math.max(0, it.quantity - selectedUnits.length);
                const fallbackCost = (Number(it.productSnapshot?.costPrice) || 0) * missingQty;
                draftTotalCost += (foundCost + fallbackCost);
            }
            else {
                const unitCost = Number(it.productSnapshot?.costPrice) || 0;
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
    async updateDraftInvoice(id, data) {
        const invoice = await this.getById(id);
        if (invoice.isFinalized) {
            throw new product_service_1.AppError('Hóa đơn đã chốt không thể sửa trực tiếp', 400);
        }
        if (data.customer)
            invoice.customer = { ...invoice.customer, ...data.customer };
        if (data.items)
            invoice.items = data.items;
        if (data.subtotal !== undefined)
            invoice.subtotal = data.subtotal;
        if (data.discount !== undefined)
            invoice.discount = data.discount;
        if (data.discountType)
            invoice.discountType = data.discountType;
        if (data.shippingFee !== undefined)
            invoice.shippingFee = data.shippingFee;
        if (data.vatEnabled !== undefined)
            invoice.vatEnabled = data.vatEnabled;
        if (data.vatPercent !== undefined)
            invoice.vatPercent = data.vatPercent;
        if (data.vatAmount !== undefined)
            invoice.vatAmount = data.vatAmount;
        if (data.grandTotal !== undefined)
            invoice.grandTotal = data.grandTotal;
        if (data.totalPaid !== undefined)
            invoice.totalPaid = data.totalPaid;
        if (data.remainingAmount !== undefined)
            invoice.remainingAmount = data.remainingAmount;
        if (data.dueDate)
            invoice.dueDate = new Date(data.dueDate);
        if (data.notes !== undefined)
            invoice.notes = data.notes;
        await invoice.save();
        return invoice;
    }
    /**
     * FINALIZES THE INVOICE (CHỐT HÓA ĐƠN).
     * Validates available stock count for items (with or without serials), customer debt due date,
     * and converts InventoryUnits from AVAILABLE / RESERVED -> SOLD.
     * THIS IS THE ONLY POINT WHERE STOCK IS OFFICIALLY DEDUCTED.
     */
    async finalizeInvoice(invoiceId, data) {
        const invoice = await this.getById(invoiceId);
        if (invoice.isFinalized) {
            throw new product_service_1.AppError('Hóa đơn này đã được chốt trước đó rồi', 400);
        }
        const now = new Date();
        const unitsToMarkSold = [];
        const allExportedSerials = [];
        const chosenUnitIdsSet = new Set(); // Tracks all units chosen across ALL lines in this invoice
        const allChosenUnitsWithSnapshots = [];
        // 1. Process each item: Ensure sufficient stock, assign available units (with or without serials)
        for (let i = 0; i < invoice.items.length; i++) {
            const item = invoice.items[i];
            const requiredQty = item.quantity || 1;
            const selectedSerials = (item.selectedSerials || []).filter((s) => s && s.trim());
            let productId = item.productId || item.productSnapshot?.productId || item.productSnapshot?._id;
            if (!productId && item.productSnapshot?.productCode) {
                const prodDoc = await models_1.Product.findOne({ productCode: item.productSnapshot.productCode }).exec();
                if (prodDoc)
                    productId = prodDoc._id.toString();
            }
            if (!productId) {
                throw new product_service_1.AppError(`Mục ${i + 1} (${item.productSnapshot?.name}): Không tìm thấy ID sản phẩm để xuất kho`, 400);
            }
            // Fetch all AVAILABLE or RESERVED units for this product in stock
            const rawAvailableUnits = await models_1.InventoryUnit.find({
                productId,
                $or: [
                    { status: types_1.InventoryUnitStatus.AVAILABLE },
                    { reservedByInvoiceId: invoice._id },
                ],
            }).sort({ serialNumber: -1, createdAt: 1 }).exec();
            // Filter out units that have already been allocated to a preceding line of the same invoice
            const availableUnits = rawAvailableUnits.filter((u) => !chosenUnitIdsSet.has(u._id.toString()));
            if (availableUnits.length < requiredQty) {
                throw new product_service_1.AppError(`Mục ${i + 1} (${item.productSnapshot?.name}): Không đủ số lượng tồn kho khả dụng để xuất (Tồn khả dụng còn lại: ${availableUnits.length}, Yêu cầu: ${requiredQty})`, 400);
            }
            const chosenUnits = [];
            // A. Match explicitly selected serial numbers first (if user picked specific serials in modal)
            if (selectedSerials.length > 0) {
                for (const sn of selectedSerials) {
                    const match = availableUnits.find((u) => u.serialNumber === sn && !chosenUnits.some((c) => c._id.equals(u._id)));
                    if (!match) {
                        throw new product_service_1.AppError(`Serial ${sn} của sản phẩm ${item.productSnapshot?.name} không còn ở trạng thái sẵn sàng trong kho`, 400);
                    }
                    chosenUnits.push(match);
                    chosenUnitIdsSet.add(match._id.toString());
                }
            }
            // B. Fill remaining quantity from unchosen available units in stock (whether they have serials or not)
            const remainingNeeded = requiredQty - chosenUnits.length;
            if (remainingNeeded > 0) {
                const unchosenAvailable = availableUnits.filter((u) => !chosenUnits.some((c) => c._id.equals(u._id)));
                const fillUnits = unchosenAvailable.slice(0, remainingNeeded);
                for (const u of fillUnits) {
                    chosenUnits.push(u);
                    chosenUnitIdsSet.add(u._id.toString());
                }
            }
            if (chosenUnits.length < requiredQty) {
                throw new product_service_1.AppError(`Mục ${i + 1} (${item.productSnapshot?.name}): Không tìm đủ đơn vị hàng khả dụng trong kho`, 400);
            }
            // Save chosen unit IDs and serial numbers
            const itemSerials = [];
            for (const u of chosenUnits) {
                unitsToMarkSold.push(u._id);
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
            }
            else {
                const fallbackCost = Number(entry.itemSnapshot?.costPrice) || 0;
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
            throw new product_service_1.AppError('Khách hàng còn nợ tiền. Vui lòng chọn HẠN THANH TOÁN CÔNG NỢ KHÁCH HÀNG', 400);
        }
        // Set Finalized Status
        invoice.isDraft = false;
        invoice.isFinalized = true;
        invoice.finalizedAt = now;
        if (invoice.remainingAmount <= 0) {
            invoice.status = types_1.InvoiceStatus.PAID;
        }
        else if (invoice.totalPaid > 0) {
            invoice.status = types_1.InvoiceStatus.PARTIALLY_PAID;
        }
        else {
            invoice.status = types_1.InvoiceStatus.UNPAID;
        }
        invoice.history.push({
            action: 'CHỐT_HÓA_ĐƠN',
            description: `Xác nhận CHỐT HÓA ĐƠN ${invoice.invoiceCode}. Đã xuất kho ${unitsToMarkSold.length} đơn vị sản phẩm${allExportedSerials.length > 0 ? ` (${allExportedSerials.length} Serial)` : ''}`,
            performedBy: 'Admin',
            createdAt: now,
        });
        // 4. Update InventoryUnits to SOLD in DB
        const session = await mongoose_1.default.startSession();
        session.startTransaction();
        try {
            if (unitsToMarkSold.length > 0) {
                await models_1.InventoryUnit.updateMany({ _id: { $in: unitsToMarkSold } }, {
                    status: types_1.InventoryUnitStatus.SOLD,
                    soldInvoiceId: invoice._id,
                    soldInvoiceCode: invoice.invoiceCode,
                    soldAt: now,
                }, { session });
            }
            await invoice.save({ session });
            await session.commitTransaction();
        }
        catch (error) {
            await session.abortTransaction();
            throw error;
        }
        finally {
            session.endSession();
        }
        // 5. Log activity & update customer metrics
        if (invoice.customerId) {
            await customerService.logActivity(invoice.customerId, {
                action: 'CHỐT_HÓA_ĐƠN',
                description: `Chốt hóa đơn bán hàng ${invoice.invoiceCode} (${unitsToMarkSold.length} SP)`,
                relatedInvoiceId: invoice._id,
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
    async addPayment(invoiceId, data) {
        const invoice = await this.getById(invoiceId);
        if (invoice.status === types_1.InvoiceStatus.CANCELLED) {
            throw new product_service_1.AppError('Không thể thanh toán cho hóa đơn đã bị hủy', 400);
        }
        const amount = Number(data.amount);
        if (!amount || amount <= 0) {
            throw new product_service_1.AppError('Số tiền thanh toán phải lớn hơn 0', 400);
        }
        if (amount > invoice.remainingAmount) {
            throw new product_service_1.AppError(`Số tiền thanh toán (${amount.toLocaleString('vi-VN')} đ) vượt quá số tiền còn nợ (${invoice.remainingAmount.toLocaleString('vi-VN')} đ)`, 400);
        }
        const paymentCount = invoice.payments.length + 1;
        const paymentCode = `PT${invoice.invoiceCode.slice(2)}-${String(paymentCount).padStart(2, '0')}`;
        const newPayment = {
            paymentCode,
            amount,
            paymentMethod: data.paymentMethod,
            bankName: data.bankName,
            referenceCode: data.referenceCode,
            paymentDate: new Date(),
            notes: data.notes,
            createdBy: data.createdBy || 'Admin',
        };
        invoice.payments.push(newPayment);
        invoice.totalPaid = (invoice.totalPaid || 0) + amount;
        invoice.remainingAmount = Math.max(0, invoice.grandTotal - invoice.totalPaid);
        if (invoice.remainingAmount <= 0) {
            invoice.status = types_1.InvoiceStatus.PAID;
        }
        else {
            invoice.status = types_1.InvoiceStatus.PARTIALLY_PAID;
        }
        invoice.history.push({
            action: 'THANH_TOÁN',
            description: `Ghi nhận thanh toán ${amount.toLocaleString('vi-VN')} đ qua ${data.paymentMethod} (${paymentCode})`,
            performedBy: data.createdBy || 'Admin',
            createdAt: new Date(),
        });
        await invoice.save();
        if (invoice.customerId) {
            await customerService.logActivity(invoice.customerId, {
                action: 'THANH_TOÁN',
                description: `Thanh toán ${amount.toLocaleString('vi-VN')} đ cho hóa đơn ${invoice.invoiceCode}`,
                relatedInvoiceId: invoice._id,
                relatedInvoiceCode: invoice.invoiceCode,
                amount,
            });
        }
        return invoice;
    }
    /**
     * Cancels invoice and releases reserved serials if draft.
     */
    async cancel(id, reason) {
        const invoice = await this.getById(id);
        // Release reserved serials back to AVAILABLE
        const reservedSerials = [];
        for (const item of invoice.items) {
            if (item.selectedSerials) {
                reservedSerials.push(...item.selectedSerials);
            }
        }
        if (reservedSerials.length > 0 && invoice.isDraft) {
            await models_1.InventoryUnit.updateMany({ serialNumber: { $in: reservedSerials }, reservedByInvoiceId: invoice._id }, { status: types_1.InventoryUnitStatus.AVAILABLE, reservedByInvoiceId: null, reservedByInvoiceCode: null });
        }
        invoice.status = types_1.InvoiceStatus.CANCELLED;
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
    async getOriginDetails(invoiceId) {
        const invoice = await invoiceRepo.findById(invoiceId);
        if (!invoice)
            throw new product_service_1.AppError('Hóa đơn không tồn tại', 404);
        // 1. Fetch all InventoryUnits linked directly to this invoice (sold or reserved)
        const linkedUnits = await models_1.InventoryUnit.find({
            $or: [
                { soldInvoiceId: invoice._id },
                { reservedByInvoiceId: invoice._id },
            ],
        }).lean().exec();
        // 2. Fetch all InventoryUnits matching any selectedSerials in items
        const allSerials = (invoice.items || []).flatMap((it) => it.selectedSerials || []).filter(Boolean);
        const serialUnits = allSerials.length > 0
            ? await models_1.InventoryUnit.find({ serialNumber: { $in: allSerials } }).lean().exec()
            : [];
        const combinedUnits = [...linkedUnits, ...serialUnits];
        const unitMapBySerial = new Map();
        const unitListByProduct = new Map();
        for (const u of combinedUnits) {
            if (u.serialNumber) {
                unitMapBySerial.set(u.serialNumber, u);
            }
            const pId = u.productId?.toString();
            if (pId) {
                if (!unitListByProduct.has(pId))
                    unitListByProduct.set(pId, []);
                const list = unitListByProduct.get(pId);
                if (!list.some((existing) => existing._id.toString() === u._id.toString())) {
                    list.push(u);
                }
            }
        }
        const now = new Date();
        const assignedUnitIds = new Set();
        // 3. For each invoice item, build origin details
        const itemOrigins = [];
        for (let idx = 0; idx < invoice.items.length; idx++) {
            const item = invoice.items[idx];
            const pId = item.productId?.toString() || item.productSnapshot?.productId || item.productSnapshot?._id?.toString();
            const productCode = item.productSnapshot?.productCode;
            const serials = (item.selectedSerials || []).filter((s) => s && s.trim());
            const neededQty = item.quantity || 1;
            let origins = [];
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
                    }
                    else {
                        const rawU = await models_1.InventoryUnit.findOne({ serialNumber: sn }).lean().exec();
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
                        }
                        else {
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
                    const queryConditions = [];
                    if (pId && mongoose_1.default.Types.ObjectId.isValid(pId)) {
                        queryConditions.push({ 'items.product': new mongoose_1.default.Types.ObjectId(pId) });
                    }
                    if (productCode) {
                        queryConditions.push({ 'items.productCode': productCode });
                    }
                    const purchases = queryConditions.length > 0
                        ? await models_1.Purchase.find({ $or: queryConditions, isDraft: { $ne: true } })
                            .sort({ purchaseDate: -1 })
                            .limit(5)
                            .lean()
                            .exec()
                        : [];
                    if (purchases.length > 0) {
                        for (const p of purchases) {
                            if (origins.length >= neededQty)
                                break;
                            const matchedItem = (p.items || []).find((it) => (pId && it.product?.toString() === pId) ||
                                (productCode && it.productCode === productCode));
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
exports.InvoiceService = InvoiceService;
//# sourceMappingURL=invoice.service.js.map