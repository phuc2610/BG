import { BaseRepository } from './base.repository';
import { IInventoryDocument } from '../models';
import { InventoryFilterQuery, PaginatedResponse } from '../types';
export declare class InventoryRepository extends BaseRepository<IInventoryDocument> {
    constructor();
    search(query: InventoryFilterQuery): Promise<PaginatedResponse<any>>;
    findByProduct(productId: string): Promise<IInventoryDocument[]>;
}
//# sourceMappingURL=inventory.repository.d.ts.map