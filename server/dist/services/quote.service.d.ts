import { IQuoteDocument } from '../models';
import { QuoteStatus, DiscountType } from '../types';
export declare class AppError extends Error {
    statusCode: number;
    constructor(message: string, statusCode?: number);
}
export declare class QuoteService {
    getAll(query: any): Promise<import("../types").PaginatedResponse<IQuoteDocument>>;
    getById(id: string): Promise<IQuoteDocument>;
    create(data: {
        customer: {
            name: string;
            phone?: string;
            email?: string;
            address?: string;
            notes?: string;
        };
        createdBy?: string;
        notes?: string;
    }): Promise<IQuoteDocument>;
    update(id: string, data: Partial<IQuoteDocument>): Promise<IQuoteDocument>;
    delete(id: string): Promise<IQuoteDocument | null>;
    addInventoryItem(quoteId: string, inventoryItemId: string, unitPrice: number, quantity?: number, warranty?: string, serialNumber?: string, conditionOverride?: string): Promise<IQuoteDocument>;
    removeProduct(quoteId: string, itemId: string): Promise<IQuoteDocument>;
    updateItem(quoteId: string, itemId: string, data: {
        unitPrice?: number;
        quantity?: number;
        discount?: number;
        discountType?: DiscountType;
        warranty?: string;
    }): Promise<IQuoteDocument>;
    updateStatus(id: string, newStatus: QuoteStatus): Promise<IQuoteDocument>;
    private adjustInventory;
    private calculateTotals;
}
//# sourceMappingURL=quote.service.d.ts.map