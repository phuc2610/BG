import { FilterQuery } from 'mongoose';
import { BaseRepository } from './base.repository';
import { Customer, ICustomerDocument, Invoice } from '../models';
import { CustomerFilterQuery, PaginatedResponse, CustomerStats, CustomerType, InvoiceStatus } from '../types';

export class CustomerRepository extends BaseRepository<ICustomerDocument> {
  constructor() {
    super(Customer);
  }

  async search(query: CustomerFilterQuery): Promise<PaginatedResponse<ICustomerDocument>> {
    const {
      page = 1,
      limit = 20,
      search,
      sort = 'createdAt',
      order = 'desc',
      customerType,
      hasDebtOnly = false,
    } = query;

    const filter: FilterQuery<ICustomerDocument> = {};

    if (customerType) filter.customerType = customerType;
    const isHasDebt = hasDebtOnly === true || String(hasDebtOnly) === 'true';
    if (isHasDebt) filter.totalDebt = { $gt: 0 };

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { customerCode: searchRegex },
        { name: searchRegex },
        { phone: searchRegex },
        { companyName: searchRegex },
        { email: searchRegex },
      ];
    }

    const skip = (page - 1) * limit;
    const sortOrder = order === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ [sort]: sortOrder })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
      },
    };
  }

  async findByPhone(phone: string): Promise<ICustomerDocument | null> {
    if (!phone || !phone.trim()) return null;
    return this.model.findOne({ phone: phone.trim() }).exec();
  }

  async getStats(): Promise<CustomerStats> {
    const totalCustomers = await this.model.countDocuments({}).exec();
    const invoices = await Invoice.find({ status: { $ne: InvoiceStatus.CANCELLED } }).exec();

    let totalRevenue = 0;
    let totalPaid = 0;
    let totalDebt = 0;
    let totalProfit = 0;

    for (const inv of invoices) {
      totalRevenue += inv.grandTotal || 0;
      totalPaid += inv.totalPaid || 0;
      totalDebt += inv.remainingAmount || 0;
      totalProfit += (inv.profit !== undefined ? inv.profit : ((inv.grandTotal || 0) - (inv.vatAmount || 0) - (inv.shippingFee || 0) - (inv.totalCost || 0)));
    }

    return {
      totalCustomers,
      totalRevenue,
      totalPaid,
      totalDebt,
      totalProfit,
    };
  }
}
