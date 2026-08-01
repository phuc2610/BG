import { BaseRepository } from './base.repository';
import { IInventoryUnitDocument } from '../models';
import { InventoryUnitFilterQuery, PaginatedResponse } from '../types';
export declare class InventoryUnitRepository extends BaseRepository<IInventoryUnitDocument> {
    constructor();
    search(query: InventoryUnitFilterQuery): Promise<PaginatedResponse<IInventoryUnitDocument>>;
    findBySerial(serial: string): Promise<IInventoryUnitDocument | null>;
}
//# sourceMappingURL=inventoryUnit.repository.d.ts.map