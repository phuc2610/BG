import { CustomerRepository, QuoteRepository, InvoiceRepository } from '../repositories';
import { Customer, CustomerActivity, generateCustomerCode, ICustomerDocument } from '../models';
import { CustomerType, ICustomer, QuoteStatus, InvoiceStatus } from '../types';
import { AppError } from './product.service';

const customerRepo = new CustomerRepository();
const quoteRepo = new QuoteRepository();
const invoiceRepo = new InvoiceRepository();

export class CustomerService {
  async getAll(query: any) {
    return customerRepo.search(query);
  }

  async getById(id: string) {
    const customer = await customerRepo.findById(id);
    if (!customer) throw new AppError('Khách hàng không tồn tại', 404);
    return customer;
  }

  async getStats() {
    return customerRepo.getStats();
  }

  /**
   * Auto-links or creates a customer by Phone number or Name to prevent duplicate records.
   */
  async findOrCreateCustomer(data: Partial<ICustomer>, createdBy: string = 'Admin'): Promise<ICustomerDocument> {
    if (!data.name || !data.name.trim()) {
      throw new AppError('Tên khách hàng là bắt buộc', 400);
    }

    const phone = data.phone?.trim();
    if (phone) {
      const existing = await customerRepo.findByPhone(phone);
      if (existing) {
        // Update existing customer info if missing
        if (!existing.address && data.address) existing.address = data.address;
        if (!existing.email && data.email) existing.email = data.email;
        if (!existing.companyName && data.companyName) existing.companyName = data.companyName;
        await existing.save();
        return existing;
      }
    }

    const customerCode = await generateCustomerCode();

    const newCustomer = await customerRepo.create({
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
      customerType: data.customerType || CustomerType.RETAIL,
      createdBy,
    } as any);

    await this.logActivity(newCustomer._id as any, {
      action: 'TẠO_KHÁCH_HÀNG',
      description: `Khởi tạo hồ sơ khách hàng mới ${customerCode} - ${newCustomer.name}`,
      performedBy: createdBy,
    });

    return newCustomer;
  }

  async create(data: Partial<ICustomer>, createdBy: string = 'Admin') {
    return this.findOrCreateCustomer(data, createdBy);
  }

  async update(id: string, data: Partial<ICustomerDocument>) {
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

  async delete(id: string) {
    const customer = await this.getById(id);
    return customerRepo.deleteById(id);
  }

  /**
   * Fetches full CRM profile: Customer info + Associated Quotes + Invoices + Payments + Debts + Activities.
   */
  async getFullProfile(id: string) {
    const customer = await this.getById(id);

    // Fetch quotes, invoices, activities in parallel
    const [quotesRes, invoicesRes, activities] = await Promise.all([
      quoteRepo.search({ limit: 100, search: customer.phone || customer.name }),
      invoiceRepo.search({ limit: 100, search: customer.phone || customer.name }),
      CustomerActivity.find({ customerId: id }).sort({ createdAt: -1 }).exec(),
    ]);

    // Recalculate customer statistics
    const invoices = invoicesRes.data;
    const activeInvoices = invoices.filter(inv => inv.status !== InvoiceStatus.CANCELLED);

    const totalOrders = activeInvoices.length;
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalDebt = 0;
    const payments: any[] = [];

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
  async logActivity(
    customerId: string,
    activity: {
      action: string;
      description: string;
      relatedQuoteId?: string;
      relatedQuoteCode?: string;
      relatedInvoiceId?: string;
      relatedInvoiceCode?: string;
      amount?: number;
      performedBy?: string;
    }
  ) {
    return CustomerActivity.create({
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
