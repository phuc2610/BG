"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerService = void 0;
const repositories_1 = require("../repositories");
const models_1 = require("../models");
const types_1 = require("../types");
const product_service_1 = require("./product.service");
const customerRepo = new repositories_1.CustomerRepository();
const quoteRepo = new repositories_1.QuoteRepository();
const invoiceRepo = new repositories_1.InvoiceRepository();
class CustomerService {
    async getAll(query) {
        return customerRepo.search(query);
    }
    async getById(id) {
        const customer = await customerRepo.findById(id);
        if (!customer)
            throw new product_service_1.AppError('Khách hàng không tồn tại', 404);
        return customer;
    }
    async getStats(ownerId) {
        return customerRepo.getStats(ownerId);
    }
    /**
     * Auto-links or creates a customer by Phone number or Name to prevent duplicate records.
     */
    async findOrCreateCustomer(data, createdBy = 'Admin', ownerId) {
        const targetOwnerId = ownerId || data.ownerId;
        if (!data.name || !data.name.trim()) {
            throw new product_service_1.AppError('Tên khách hàng là bắt buộc', 400);
        }
        const phone = data.phone?.trim();
        if (phone) {
            const existing = await customerRepo.findByPhone(phone, targetOwnerId);
            if (existing) {
                // Update existing customer info if missing
                if (!existing.address && data.address)
                    existing.address = data.address;
                if (!existing.email && data.email)
                    existing.email = data.email;
                if (!existing.companyName && data.companyName)
                    existing.companyName = data.companyName;
                await existing.save();
                return existing;
            }
        }
        const customerCode = await (0, models_1.generateCustomerCode)(targetOwnerId);
        const newCustomer = await customerRepo.create({
            ownerId: targetOwnerId,
            customerCode,
            name: data.name.trim(),
            companyName: data.companyName?.trim(),
            contactPerson: data.contactPerson?.trim(),
            phone: phone || undefined,
            secondaryPhone: data.secondaryPhone?.trim(),
            email: data.email?.trim(),
            facebook: data.facebook?.trim(),
            zalo: data.zalo?.trim(),
            address: data.address?.trim(),
            taxCode: data.taxCode?.trim(),
            notes: data.notes?.trim(),
            customerType: data.customerType || types_1.CustomerType.RETAIL,
            createdBy,
        });
        await this.logActivity(newCustomer._id, {
            action: 'TẠO_KHÁCH_HÀNG',
            description: `Khởi tạo hồ sơ khách hàng mới ${customerCode} - ${newCustomer.name}`,
            performedBy: createdBy,
        });
        return newCustomer;
    }
    async create(data, createdBy = 'Admin', ownerId) {
        return this.findOrCreateCustomer(data, createdBy, ownerId);
    }
    async update(id, data) {
        const customer = await this.getById(id);
        Object.assign(customer, data);
        await customer.save();
        await this.logActivity(id, {
            action: 'CẬP_NHẬT_KHÁCH_HÀNG',
            description: 'Cập nhật thông tin hồ sơ khách hàng',
            performedBy: 'Admin',
        });
        return customer;
    }
    async delete(id) {
        const customer = await this.getById(id);
        return customerRepo.deleteById(id);
    }
    /**
     * Fetches full CRM profile: Customer info + Associated Quotes + Invoices + Payments + Debts + Activities.
     */
    async getFullProfile(id) {
        const customer = await this.getById(id);
        // Fetch quotes, invoices, activities in parallel
        const [quotesRes, invoicesRes, activities] = await Promise.all([
            quoteRepo.search({ limit: 100, search: customer.phone || customer.name }),
            invoiceRepo.search({ limit: 100, search: customer.phone || customer.name }),
            models_1.CustomerActivity.find({ customerId: id }).sort({ createdAt: -1 }).exec(),
        ]);
        // Recalculate customer statistics
        const invoices = invoicesRes.data;
        const activeInvoices = invoices.filter(inv => inv.status !== types_1.InvoiceStatus.CANCELLED);
        const totalOrders = activeInvoices.length;
        let totalRevenue = 0;
        let totalPaid = 0;
        let totalDebt = 0;
        const payments = [];
        for (const inv of activeInvoices) {
            totalRevenue += inv.grandTotal || 0;
            totalPaid += inv.totalPaid || 0;
            totalDebt += inv.remainingAmount || 0;
            if (inv.payments && inv.payments.length > 0) {
                inv.payments.forEach(p => {
                    payments.push({
                        ...p,
                        invoiceCode: inv.invoiceCode,
                        invoiceId: inv._id,
                    });
                });
            }
        }
        // Sync financial metrics back to Customer doc
        customer.totalOrders = totalOrders;
        customer.totalRevenue = totalRevenue;
        customer.totalPaid = totalPaid;
        customer.totalDebt = totalDebt;
        if (activeInvoices.length > 0) {
            const dates = activeInvoices.map(inv => new Date(inv.createdDate).getTime());
            customer.firstPurchaseDate = new Date(Math.min(...dates));
            customer.lastPurchaseDate = new Date(Math.max(...dates));
        }
        await customer.save();
        return {
            customer,
            quotes: quotesRes.data,
            invoices: activeInvoices,
            payments,
            activities,
        };
    }
    /**
     * Logs an activity to the Customer CRM timeline.
     */
    async logActivity(customerId, activity) {
        return models_1.CustomerActivity.create({
            customerId,
            action: activity.action,
            description: activity.description,
            relatedQuoteId: activity.relatedQuoteId,
            relatedQuoteCode: activity.relatedQuoteCode,
            relatedInvoiceId: activity.relatedInvoiceId,
            relatedInvoiceCode: activity.relatedInvoiceCode,
            amount: activity.amount,
            performedBy: activity.performedBy || 'Admin',
            createdAt: new Date(),
        });
    }
}
exports.CustomerService = CustomerService;
//# sourceMappingURL=customer.service.js.map