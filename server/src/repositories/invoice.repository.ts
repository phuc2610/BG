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
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.createdDate.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdDate.$lte = end;
      }
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

  async getStats(startDate?: string, endDate?: string): Promise<InvoiceStats> {
    const filter: FilterQuery<IInvoiceDocument> = { status: { $ne: InvoiceStatus.CANCELLED } };

    if (startDate || endDate) {
      filter.createdDate = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.createdDate.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdDate.$lte = end;
      }
    }

    const activeInvoices = await this.model.find(filter).exec();

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
