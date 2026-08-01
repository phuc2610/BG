import { Model, FilterQuery, Document } from 'mongoose';
import { PaginatedResponse } from '../types';
export declare class BaseRepository<T extends Document> {
    protected model: Model<T>;
    constructor(model: Model<T>);
    findById(id: string): Promise<T | null>;
    findOne(filter: FilterQuery<T>): Promise<T | null>;
    findAll(filter?: FilterQuery<T>): Promise<T[]>;
    findPaginated(filter: FilterQuery<T>, page?: number, limit?: number, sort?: string, order?: 'asc' | 'desc'): Promise<PaginatedResponse<T>>;
    create(data: Partial<T>): Promise<T>;
    updateById(id: string, data: Partial<T>): Promise<T | null>;
    deleteById(id: string): Promise<T | null>;
    count(filter?: FilterQuery<T>): Promise<number>;
    aggregate(pipeline: any[]): Promise<any[]>;
}
//# sourceMappingURL=base.repository.d.ts.map