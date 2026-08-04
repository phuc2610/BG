import { FilterQuery } from 'mongoose';
import { BaseRepository } from './base.repository';
import { Invoice, IInvoiceDocument } from '../models';
import { InvoiceFilterQuery, PaginatedResponse, InvoiceStats, InvoiceStatus } from '../types';

export class InvoiceRepository extends BaseRepository<IInvoiceDocument> {
  constructor() {
    super(Invoice);
  }

  async search(query: InvoiceFilterQuery): Promise<PaginatedResponse<IInvoiceDocument>> {
    const {
      page = 1,
      limit = 20,
      search,
      sort = 'createdAt',
      order = 'desc',
      status,
      startDate,
      endDate,
    } = query;

    const filter: FilterQuery<IInvoiceDocument> = {};

    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.createdDate = {};
      if (startDate) filter.createdDate.$gte = new Date(startDate);
      if (endDate) filter.createdDate.$lte = new Date(endDate);
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { invoiceCode: searchRegex },
        { quoteCode: searchRegex },
        { 'customer.name': searchRegex },
        { 'customer.phone': searchRegex },
        { 'items.productSnapshot.name': searchRegex },
        { 'items.serialNumber': searchRegex },
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

  async getStats(): Promise<InvoiceStats> {
    const activeInvoices = await this.model.find({ status: { $ne: InvoiceStatus.CANCELLED } }).exec();

    const totalInvoices = activeInvoices.length;
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalReceivables = 0;

    for (const inv of activeInvoices) {
      totalRevenue += inv.grandTotal || 0;
      totalPaid += inv.totalPaid || 0;
      totalReceivables += inv.remainingAmount || 0;
    }

    const averageInvoiceValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

    return {
      totalRevenue,
      totalPaid,
      totalReceivables,
      totalInvoices,
      averageInvoiceValue,
    };
  }
}
