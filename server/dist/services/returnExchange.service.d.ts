import mongoose from 'mongoose';
import { ReturnItemCondition } from '../types';
export interface ProcessReturnInput {
    items: Array<{
        order: number;
        refundAmount: number;
        debtReduction: number;
        condition: ReturnItemCondition;
    }>;
    reason?: string;
    notes?: string;
}
export interface ProcessExchangeInput {
    exchanges: Array<{
        order: number;
        oldCondition: ReturnItemCondition;
        newProductId: string;
        newSerialNumber?: string;
        newSalePrice: number;
        customerPaidExtra: number;
        customerDebtAdded: number;
        cashRefund: number;
        debtReduction: number;
    }>;
    reason?: string;
    notes?: string;
}
export declare class ReturnExchangeService {
    /**
     * Fetches all Return/Exchange transactions for an invoice
     */
    getInvoiceTransactions(invoiceId: string): Promise<(mongoose.Document<unknown, {}, import("../models").IReturnExchangeDocument, {}, {}> & import("../models").IReturnExchangeDocument & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    /**
     * Process RETURN of one or multiple items from a finalized invoice.
     */
    processReturn(invoiceId: string, data: ProcessReturnInput, createdBy?: string): Promise<{
        transaction: mongoose.Document<unknown, {}, import("../models").IReturnExchangeDocument, {}, {}> & import("../models").IReturnExchangeDocument & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        };
        invoice: mongoose.Document<unknown, {}, import("../models").IInvoiceDocument, {}, {}> & import("../models").IInvoiceDocument & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        };
    }>;
    /**
     * Process EXCHANGE of one or multiple items from a finalized invoice.
     */
    processExchange(invoiceId: string, data: ProcessExchangeInput, createdBy?: string): Promise<{
        transaction: mongoose.Document<unknown, {}, import("../models").IReturnExchangeDocument, {}, {}> & import("../models").IReturnExchangeDocument & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        };
        invoice: mongoose.Document<unknown, {}, import("../models").IInvoiceDocument, {}, {}> & import("../models").IInvoiceDocument & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        };
    }>;
}
/**
 * Deterministically recalculates active total cost and realized profit for an invoice,
 * taking into account all original line costs, returned items, and exchanged items.
 */
export declare function recalculateInvoiceFinancials(invoice: any, session?: mongoose.ClientSession): Promise<void>;
//# sourceMappingURL=returnExchange.service.d.ts.map