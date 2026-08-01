import { InvoiceRepository, CustomerRepository } from '../repositories';
import { InvoiceStatus, IDebt, DebtStats, DebtFilterQuery, PaginatedResponse } from '../types';
import { InvoiceService } from './invoice.service';

const invoiceRepo = new InvoiceRepository();
const customerRepo = new CustomerRepository();
const invoiceService = new InvoiceService();

export class DebtService {
  /**
   * Scans invoices and returns paginated list of debts with overdue calculations and status badges.
   */
  async getDebts(query: DebtFilterQuery): Promise<PaginatedResponse<IDebt>> {
    const {
      page = 1,
      limit = 20,
      search,
      debtStatus = 'all',
      customerId,
    } = query;
    const ownerId = (query as any).ownerId;

    // Fetch invoices that have remaining debt or matching search
    const invoicesRes = await invoiceRepo.search({
      page: 1,
      limit: 1000,
      search,
      customerId,
      ownerId,
    } as any);

    const now = new Date();

    const allDebts: IDebt[] = invoicesRes.data
      .filter((inv) => inv.status !== InvoiceStatus.CANCELLED)
      .map((inv) => {
        const createdDate = new Date(inv.createdDate);
        // Standard due date: 14 days after invoice creation
        const dueDate = new Date(createdDate.getTime() + 14 * 24 * 60 * 60 * 1000);

        const diffTime = now.getTime() - dueDate.getTime();
        const overdueDays = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;

        let status: 'PAID' | 'UNPAID' | 'PARTIALLY_PAID' | 'DUE_SOON' | 'OVERDUE' | 'CANCELLED' = 'UNPAID';

        if (inv.remainingAmount <= 0) {
          status = 'PAID';
        } else if (overdueDays > 0) {
          status = 'OVERDUE';
        } else if (overdueDays >= -3) {
          status = 'DUE_SOON';
        } else if (inv.totalPaid > 0) {
          status = 'PARTIALLY_PAID';
        }

        return {
          _id: inv._id ? inv._id.toString() : '',
          invoiceId: inv._id ? inv._id.toString() : '',
          invoiceCode: inv.invoiceCode,
          quoteCode: inv.quoteCode,
          customerId: inv.customerId as any,
          customer: inv.customer,
          createdDate,
          dueDate,
          grandTotal: inv.grandTotal,
          totalPaid: inv.totalPaid,
          remainingAmount: inv.remainingAmount,
          overdueDays,
          debtStatus: status,
        };
      });

    // Apply status filtering
    let filteredDebts = allDebts;
    if (debtStatus === 'has_debt') {
      filteredDebts = allDebts.filter((d) => d.remainingAmount > 0);
    } else if (debtStatus === 'due_soon') {
      filteredDebts = allDebts.filter((d) => d.debtStatus === 'DUE_SOON');
    } else if (debtStatus === 'overdue') {
      filteredDebts = allDebts.filter((d) => d.debtStatus === 'OVERDUE');
    } else if (debtStatus === 'paid') {
      filteredDebts = allDebts.filter((d) => d.remainingAmount <= 0);
    }

    // Paginate in-memory
    const total = filteredDebts.length;
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;
    const paginatedDebts = filteredDebts.slice(skip, skip + limit);

    return {
      data: paginatedDebts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
      },
    };
  }

  /**
   * Calculates overall debt statistics for the Dashboard.
   */
  async getDebtStats(ownerId?: string): Promise<DebtStats> {
    const debtsRes = await this.getDebts({ limit: 5000, ownerId } as any);
    const debts = debtsRes.data;

    let totalDebt = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let totalOverdue = 0;

    const customerDebtMap = new Map<string, { name: string; phone?: string; amount: number }>();

    for (const d of debts) {
      totalDebt += d.grandTotal;
      totalCollected += d.totalPaid;
      totalOutstanding += d.remainingAmount;

      if (d.debtStatus === 'OVERDUE') {
        totalOverdue += d.remainingAmount;
      }

      if (d.remainingAmount > 0 && d.customer?.name) {
        const key = d.customer.phone || d.customer.name;
        const current = customerDebtMap.get(key) || { name: d.customer.name, phone: d.customer.phone, amount: 0 };
        current.amount += d.remainingAmount;
        customerDebtMap.set(key, current);
      }
    }

    let topDebtor: { name: string; phone?: string; amount: number } | undefined;
    let maxAmount = 0;
    customerDebtMap.forEach((val) => {
      if (val.amount > maxAmount) {
        maxAmount = val.amount;
        topDebtor = val;
      }
    });

    return {
      totalDebt,
      totalCollected,
      totalOutstanding,
      totalOverdue,
      topDebtor,
      monthlyRevenue: totalCollected,
    };
  }

  /**
   * Record debt payment for an invoice.
   */
  async recordPayment(invoiceId: string, paymentData: any) {
    return invoiceService.addPayment(invoiceId, paymentData);
  }
}
