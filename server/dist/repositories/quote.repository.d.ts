import { BaseRepository } from './base.repository';
import { IQuoteDocument } from '../models';
import { QuoteFilterQuery, PaginatedResponse } from '../types';
export declare class QuoteRepository extends BaseRepository<IQuoteDocument> {
    constructor();
    search(query: QuoteFilterQuery): Promise<PaginatedResponse<IQuoteDocument>>;
    findByQuoteCode(quoteCode: string): Promise<IQuoteDocument | null>;
}
//# sourceMappingURL=quote.repository.d.ts.map