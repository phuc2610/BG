import { Request, Response, NextFunction } from 'express';
import { DebtService } from '../services/debt.service';

const debtService = new DebtService();

const asyncHandler =
  (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export class DebtController {
  // GET /api/debts
  getDebts = asyncHandler(async (req: Request, res: Response) => {
    const result = await debtService.getDebts(req.query);
    res.json({ success: true, ...result });
  });

  // GET /api/debts/stats
  getDebtStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await debtService.getDebtStats();
    res.json({ success: true, data: stats });
  });

  // POST /api/debts/:invoiceId/payments
  recordPayment = asyncHandler(async (req: Request, res: Response) => {
    const invoiceId = Array.isArray(req.params.invoiceId)
      ? req.params.invoiceId[0]
      : req.params.invoiceId;
    const invoice = await debtService.recordPayment(invoiceId, req.body);
    res.json({ success: true, data: invoice });
  });
}
