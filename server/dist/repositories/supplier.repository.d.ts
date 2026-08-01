import { BaseRepository } from './base.repository';
import { ISupplierDocument } from '../models';
import { SupplierFilterQuery, PaginatedResponse, SupplierStats } from '../types';
export declare class SupplierRepository extends BaseRepository<ISupplierDocument> {
    constructor();
    search(query: SupplierFilterQuery): Promise<PaginatedResponse<ISupplierDocument>>;
    getStats(ownerId?: string): Promise<SupplierStats>;
}
//# sourceMappingURL=supplier.repository.d.ts.map