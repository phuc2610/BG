import { BaseRepository } from './base.repository';
import { ICustomerDocument } from '../models';
import { CustomerFilterQuery, PaginatedResponse, CustomerStats } from '../types';
export declare class CustomerRepository extends BaseRepository<ICustomerDocument> {
    constructor();
    search(query: CustomerFilterQuery): Promise<PaginatedResponse<ICustomerDocument>>;
    findByPhone(phone: string): Promise<ICustomerDocument | null>;
    getStats(): Promise<CustomerStats>;
}
//# sourceMappingURL=customer.repository.d.ts.map