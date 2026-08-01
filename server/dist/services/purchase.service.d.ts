import { PurchaseFilterQuery, PaymentMethod, PurchaseStats } from '../types';
export declare class PurchaseService {
    getAll(query: PurchaseFilterQuery): Promise<import("../types").PaginatedResponse<import("../models").IPurchaseDocument>>;
    getById(id: string): Promise<import("../models").IPurchaseDocument>;
    /**
     * Helper to parse and clean raw serial input string (lines/commas/spaces).
     */
    parseSerials(rawSerialInput: string | string[]): string[];
    /**
     * Creates a new Purchase Ticket and auto-creates InventoryUnit for every serial.
     */
    create(data: {
        supplierId: string;
        purchaseDate?: Date;
        notes?: string;
        paidAmount?: number;
        dueDate?: Date;
        ownerId?: string;
        items: Array<{
            productId: string;
            quantity: number;
            costPrice: number;
            condition?: any;
            supplierWarrantyMonths?: number;
            serialsRaw?: string | string[];
        }>;
    }): Promise<import("../models").IPurchaseDocument>;
    /**
     * Add a payment record to a purchase ticket to pay off supplier debt.
     */
    addPayment(purchaseId: string, data: {
        amount: number;
        paymentMethod: PaymentMethod;
        bankName?: string;
        referenceCode?: string;
        note?: string;
    }): Promise<import("../models").IPurchaseDocument>;
    /**
     * Calculates overall Purchase Financial Dashboard statistics.
     */
    getPurchaseStats(startDate?: string, endDate?: string, ownerId?: string): Promise<PurchaseStats>;
}
//# sourceMappingURL=purchase.service.d.ts.map