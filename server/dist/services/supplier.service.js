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
        Object.assign(supplier, data);
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
    /**
     * Returns complete Supplier profile: Details + Purchases + Payments + Debt + Purchased Products
     */
    async getFullProfile(id) {
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
            purchases: activePurchases,
            payments,
            purchasedUnits: unitsRes.data,
        };
    }
}
exports.SupplierService = SupplierService;
//# sourceMappingURL=supplier.service.js.map