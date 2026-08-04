import { IInvoiceDocument } from '../models';
import { PaymentMethod } from '../types';
export declare class InvoiceService {
    getAll(query: any): Promise<import("../types").PaginatedResponse<IInvoiceDocument>>;
    getById(id: string): Promise<IInvoiceDocument>;
    getStats(): Promise<import("../types").InvoiceStats>;
    /**
     * Creates a new DRAFT Invoice by copying data from a confirmed Quote.
     * Does NOT reduce stock or reserve serials yet.
     */
    createFromQuote(quoteId: string, createdBy?: string): Promise<IInvoiceDocument>;
    /**
     * Selects and reserves serials for a draft invoice item line.
     * Reverts unselected serials to AVAILABLE and sets selected serials to RESERVED.
     */
    selectSerialsForDraftItem(invoiceId: string, itemIndex: number, selectedSerials: string[]): Promise<IInvoiceDocument>;
    /**
     * Updates basic fields of a Draft Invoice (Customer, Items, Prices, Discount, Shipping, Payments).
     */
    updateDraftInvoice(id: string, data: Partial<IInvoiceDocument>): Promise<IInvoiceDocument>;
    /**
     * FINALIZES THE INVOICE (CHỐT HÓA ĐƠN).
     * Validates serials, customer debt due date, and atomically converts InventoryUnits from RESERVED -> SOLD.
     * THIS IS THE ONLY POINT WHERE STOCK IS OFFICIALLY DEDUCTED.
     */
    finalizeInvoice(invoiceId: string, data?: {
        paidAmount?: number;
        dueDate?: Date;
        notes?: string;
    }): Promise<IInvoiceDocument>;
    /**
     * Adds payment to invoice.
     */
    addPayment(invoiceId: string, data: {
        amount: number;
        paymentMethod: PaymentMethod;
        bankName?: string;
        referenceCode?: string;
        notes?: string;
        createdBy?: string;
    }): Promise<IInvoiceDocument>;
    /**
     * Cancels invoice and releases reserved serials if draft.
     */
    cancel(id: string, reason?: string): Promise<IInvoiceDocument>;
}
//# sourceMappingURL=invoice.service.d.ts.map