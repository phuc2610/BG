import { IDebt, DebtStats, DebtFilterQuery, PaginatedResponse } from '../types';
export declare class DebtService {
    /**
     * Scans invoices and returns paginated list of debts with overdue calculations and status badges.
     */
    getDebts(query: DebtFilterQuery): Promise<PaginatedResponse<IDebt>>;
    /**
     * Calculates overall debt statistics for the Dashboard.
     */
    getDebtStats(ownerId?: string): Promise<DebtStats>;
    /**
     * Record debt payment for an invoice.
     */
    recordPayment(invoiceId: string, paymentData: any): Promise<import("../models").IInvoiceDocument>;
}
//# sourceMappingURL=debt.service.d.ts.map