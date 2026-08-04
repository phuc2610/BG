import { ICustomerDocument } from '../models';
import { ICustomer } from '../types';
export declare class CustomerService {
    getAll(query: any): Promise<import("../types").PaginatedResponse<ICustomerDocument>>;
    getById(id: string): Promise<ICustomerDocument>;
    getStats(): Promise<import("../types").CustomerStats>;
    /**
     * Auto-links or creates a customer by Phone number or Name to prevent duplicate records.
     */
    findOrCreateCustomer(data: Partial<ICustomer>, createdBy?: string): Promise<ICustomerDocument>;
    create(data: Partial<ICustomer>, createdBy?: string): Promise<ICustomerDocument>;
    update(id: string, data: Partial<ICustomerDocument>): Promise<ICustomerDocument>;
    delete(id: string): Promise<ICustomerDocument | null>;
    /**
     * Fetches full CRM profile: Customer info + Associated Quotes + Invoices + Payments + Debts + Activities.
     */
    getFullProfile(id: string): Promise<{
        customer: ICustomerDocument;
        quotes: import("../models").IQuoteDocument[];
        invoices: import("../models").IInvoiceDocument[];
        payments: any[];
        activities: (import("mongoose").Document<unknown, {}, import("../types").ICustomerActivity, {}, {}> & import("../types").ICustomerActivity & Required<{
            _id: string;
        }> & {
            __v: number;
        })[];
    }>;
    /**
     * Logs an activity to the Customer CRM timeline.
     */
    logActivity(customerId: string, activity: {
        action: string;
        description: string;
        relatedQuoteId?: string;
        relatedQuoteCode?: string;
        relatedInvoiceId?: string;
        relatedInvoiceCode?: string;
        amount?: number;
        performedBy?: string;
    }): Promise<import("mongoose").Document<unknown, {}, import("../types").ICustomerActivity, {}, {}> & import("../types").ICustomerActivity & Required<{
        _id: string;
    }> & {
        __v: number;
    }>;
}
//# sourceMappingURL=customer.service.d.ts.map