import { FilterQuery } from 'mongoose';
import { BaseRepository } from './base.repository';
import { Customer, CustomerActivity, ICustomerDocument } from '../models';
import { CustomerFilterQuery, PaginatedResponse, CustomerStats, CustomerType } from '../types';

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
      isOverdueOnly = false,
    } = query;

    const filter: FilterQuery<ICustomerDocument> = {};

    if (customerType) filter.customerType = customerType;
    const isHasDebt = hasDebtOnly === true || String(hasDebtOnly) === 'true';
    if (isHasDebt) filter.totalDebt = { $gt: 0 };
    if ((query as any).ownerId) filter.ownerId = (query as any).ownerId;

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

  async findByPhone(phone: string, ownerId?: string): Promise<ICustomerDocument | null> {
    if (!phone || !phone.trim()) return null;
    const filter: any = { phone: phone.trim() };
    if (ownerId) filter.ownerId = ownerId;
    return this.model.findOne(filter).exec();
  }

  async getStats(ownerId?: string): Promise<CustomerStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const filter: any = {};
    if (ownerId) filter.ownerId = ownerId;

    const [
      totalCustomers,
      newThisMonth,
      totalVip,
      totalEnterprise,
      customersWithDebt,
    ] = await Promise.all([
      this.model.countDocuments(filter),
      this.model.countDocuments({ ...filter, createdAt: { $gte: startOfMonth } }),
      this.model.countDocuments({ ...filter, customerType: CustomerType.VIP }),
      this.model.countDocuments({ ...filter, customerType: CustomerType.ENTERPRISE }),
      this.model.countDocuments({ ...filter, totalDebt: { $gt: 0 } }),
    ]);

    return {
      totalCustomers,
      newThisMonth,
      totalVip,
      totalEnterprise,
      customersWithDebt,
      overdueCustomers: 0, // calculated via DebtService
    };
  }
}
