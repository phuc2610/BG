import { BaseRepository } from './base.repository';
import { IInvoiceDocument } from '../models';
import { InvoiceFilterQuery, PaginatedResponse, InvoiceStats } from '../types';
export declare class InvoiceRepository extends BaseRepository<IInvoiceDocument> {
    constructor();
    search(query: InvoiceFilterQuery): Promise<PaginatedResponse<IInvoiceDocument>>;
    getStats(startDate?: string, endDate?: string): Promise<InvoiceStats>;
}
//# sourceMappingURL=invoice.repository.d.ts.map