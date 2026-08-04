import { FilterQuery } from 'mongoose';
import { BaseRepository } from './base.repository';
import { Purchase, IPurchaseDocument } from '../models';
import { PurchaseFilterQuery, PaginatedResponse } from '../types';

export class PurchaseRepository extends BaseRepository<IPurchaseDocument> {
  constructor() {
    super(Purchase);
  }

  async search(query: PurchaseFilterQuery): Promise<PaginatedResponse<IPurchaseDocument>> {
    const {
      page = 1,
      limit = 20,
      search,
      sort = 'purchaseDate',
      order = 'desc',
      supplierId,
      status,
      startDate,
      endDate,
    } = query;

    const filter: FilterQuery<IPurchaseDocument> = {};

    if (supplierId) filter.supplierId = supplierId;
    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.purchaseDate = {};
      if (startDate) filter.purchaseDate.$gte = new Date(startDate);
      if (endDate) filter.purchaseDate.$lte = new Date(endDate);
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { purchaseCode: searchRegex },
        { 'supplier.name': searchRegex },
        { 'supplier.phone': searchRegex },
        { 'items.productName': searchRegex },
        { 'items.productCode': searchRegex },
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
}
