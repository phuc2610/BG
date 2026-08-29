"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierService = void 0;
const repositories_1 = require("../repositories");
const models_1 = require("../models");
const product_service_1 = require("./product.service");
const supplierRepo = new repositories_1.SupplierRepository();
const purchaseRepo = new repositories_1.PurchaseRepository();
const unitRepo = new repositories_1.InventoryUnitRepository();
class SupplierService {
    async getAll(query) {
        return supplierRepo.search(query);
    }
    async getById(id) {
        const supplier = await supplierRepo.findById(id);
        if (!supplier)
            throw new product_service_1.AppError('Nhà cung cấp không tồn tại', 404);
        return supplier;
    }
    async getStats() {
        return supplierRepo.getStats();
    }
    async create(data) {
        if (!data.name || !data.name.trim()) {
            throw new product_service_1.AppError('Tên nhà cung cấp là bắt buộc', 400);
        }
        const supplierCode = await (0, models_1.generateSupplierCode)();
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
        });
        return supplier;
    }
    async update(id, data) {
        const supplier = await this.getById(id);
        if (data.name !== undefined)
            supplier.name = data.name.trim();
        if (data.companyName !== undefined)
            supplier.companyName = data.companyName.trim();
        if (data.phone !== undefined)
            supplier.phone = data.phone.trim();
        if (data.zalo !== undefined)
            supplier.zalo = data.zalo.trim();
        if (data.email !== undefined)
            supplier.email = data.email.trim();
        if (data.address !== undefined)
            supplier.address = data.address.trim();
        if (data.taxCode !== undefined)
            supplier.taxCode = data.taxCode.trim();
        if (data.accountNumber !== undefined)
            supplier.accountNumber = data.accountNumber.trim();
        if (data.bankName !== undefined)
            supplier.bankName = data.bankName.trim();
        if (data.notes !== undefined)
            supplier.notes = data.notes.trim();
        await supplier.save();
        return supplier;
    }
    async delete(id) {
        const supplier = await this.getById(id);
        if ((supplier.purchaseCount || 0) > 0) {
            throw new product_service_1.AppError('Không thể xóa nhà cung cấp đã có lịch sử nhập hàng', 400);
        }
        return supplierRepo.deleteById(id);
    }
    async getFullProfile(id) {
        const supplier = await this.getById(id);
        const [purchases, rawUnits] = await Promise.all([
            models_1.Purchase.find({ supplierId: id, isDraft: { $ne: true }, status: { $ne: 'DRAFT' } })
                .sort({ purchaseDate: -1 })
                .lean()
                .exec(),
            models_1.InventoryUnit.find({ supplierId: id })
                .sort({ purchaseDate: -1 })
                .exec(),
        ]);
        const activePurchases = purchases;
        // 1. Gather all invoice IDs related to these units (sold or reserved)
        const invoiceIds = Array.from(new Set([
            ...rawUnits.map((u) => u.soldInvoiceId?.toString()),
            ...rawUnits.map((u) => u.reservedByInvoiceId?.toString()),
        ].filter(Boolean)));
        const invoices = invoiceIds.length > 0
            ? await models_1.Invoice.find({ _id: { $in: invoiceIds } })
                .select('invoiceCode customerId customer createdDate createdBy status isFinalized')
                .lean()
                .exec()
            : [];
        const invoiceMap = new Map(invoices.map((inv) => [inv._id.toString(), inv]));
        const now = new Date();
        const purchasedUnits = rawUnits.map((u) => {
            const endDate = new Date(u.supplierWarrantyEndDate);
            const diffTime = endDate.getTime() - now.getTime();
            const remainingDays = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;
            let warrantyStatus = 'NORMAL';
            if (remainingDays <= 0) {
                warrantyStatus = 'EXPIRED';
            }
            else if (remainingDays <= 30) {
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
        const serialToUnitMap = new Map(purchasedUnits.map((u) => [u.serialNumber, u]));
        // 2. Enrich each purchase item with serial details
        const enrichedPurchases = activePurchases.map((p) => {
            const itemsWithSerials = (p.items || []).map((it) => {
                const serialDetails = (it.serials || []).map((sn) => {
                    return (serialToUnitMap.get(sn) || {
                        serialNumber: sn,
                        status: 'AVAILABLE',
                    });
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
        const payments = [];
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
            purchases: enrichedPurchases,
            payments,
            purchasedUnits,
        };
    }
}
exports.SupplierService = SupplierService;
//# sourceMappingURL=supplier.service.js.map