import { FilterQuery } from 'mongoose';
import { BaseRepository } from './base.repository';
import { Quote, IQuoteDocument } from '../models';
import { QuoteFilterQuery, PaginatedResponse } from '../types';

export class QuoteRepository extends BaseRepository<IQuoteDocument> {
  constructor() {
    super(Quote);
  }

  async search(query: QuoteFilterQuery): Promise<PaginatedResponse<IQuoteDocument>> {
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

    const filter: FilterQuery<IQuoteDocument> = {};

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { quoteCode: searchRegex },
        { 'customer.name': searchRegex },
        { 'customer.phone': searchRegex },
      ];
    }

    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.createdDate = {};
      if (startDate) filter.createdDate.$gte = new Date(startDate);
      if (endDate) filter.createdDate.$lte = new Date(endDate);
    }

    return this.findPaginated(filter, page, limit, sort, order);
  }

  async findByQuoteCode(quoteCode: string): Promise<IQuoteDocument | null> {
    return this.findOne({ quoteCode });
  }
}
