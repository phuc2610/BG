import { BaseRepository } from './base.repository';
import { IPurchaseDocument } from '../models';
import { PurchaseFilterQuery, PaginatedResponse } from '../types';
export declare class PurchaseRepository extends BaseRepository<IPurchaseDocument> {
    constructor();
    search(query: PurchaseFilterQuery): Promise<PaginatedResponse<IPurchaseDocument>>;
}
//# sourceMappingURL=purchase.repository.d.ts.map