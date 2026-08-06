import { Request, Response, NextFunction } from 'express';
import { InvoiceService } from '../services/invoice.service';

const invoiceService = new InvoiceService();

const asyncHandler =
  (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export class InvoiceController {
  // GET /api/invoices
  getAll = asyncHandler(async (req: Request, res: Response) => {
    const result = await invoiceService.getAll(req.query);
    res.json({ success: true, ...result });
  });

  // GET /api/invoices/stats
  getStats = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query as any;
    const stats = await invoiceService.getStats(startDate, endDate);
    res.json({ success: true, data: stats });
  });

  // GET /api/invoices/:id
  getById = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const invoice = await invoiceService.getById(id);
    res.json({ success: true, data: invoice });
  });

  // POST /api/invoices/from-quote/:quoteId
  createFromQuote = asyncHandler(async (req: Request, res: Response) => {
    const quoteId = Array.isArray(req.params.quoteId)
      ? req.params.quoteId[0]
      : req.params.quoteId;
    const creatorName = (req as any).user?.fullName || (req as any).user?.username || req.body?.createdBy;
    const invoice = await invoiceService.createFromQuote(quoteId, creatorName);
    res.status(201).json({ success: true, data: invoice });
  });

  // POST /api/invoices/:id/payments
  addPayment = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const invoice = await invoiceService.addPayment(id, req.body);
    res.json({ success: true, data: invoice });
  });

  // PUT /api/invoices/:id/draft
  updateDraft = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const invoice = await invoiceService.updateDraftInvoice(id, req.body);
    res.json({ success: true, data: invoice });
  });

  // POST /api/invoices/:id/select-serials
  selectSerials = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { itemIndex, selectedSerials } = req.body;
    const invoice = await invoiceService.selectSerialsForDraftItem(id, itemIndex, selectedSerials);
    res.json({ success: true, data: invoice });
  });

  // POST /api/invoices/:id/finalize
  finalize = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const invoice = await invoiceService.finalizeInvoice(id, req.body);
    res.json({ success: true, data: invoice });
  });

  // PUT /api/invoices/:id
  update = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const invoice = await invoiceService.updateDraftInvoice(id, req.body);
    res.json({ success: true, data: invoice });
  });

  // POST /api/invoices/:id/cancel
  cancel = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { reason } = req.body;
    const invoice = await invoiceService.cancel(id, reason);
    res.json({ success: true, data: invoice });
  });

  // POST /api/invoices/:id/return
  processReturn = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const creatorName = (req as any).user?.fullName || (req as any).user?.username || 'Admin';
    const { ReturnExchangeService } = await import('../services/returnExchange.service');
    const returnService = new ReturnExchangeService();
    const result = await returnService.processReturn(id, req.body, creatorName);
    res.json({ success: true, data: result });
  });

  // POST /api/invoices/:id/exchange
  processExchange = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const creatorName = (req as any).user?.fullName || (req as any).user?.username || 'Admin';
    const { ReturnExchangeService } = await import('../services/returnExchange.service');
    const returnService = new ReturnExchangeService();
    const result = await returnService.processExchange(id, req.body, creatorName);
    res.json({ success: true, data: result });
  });

  // GET /api/invoices/:id/return-exchange-history
  getReturnExchangeHistory = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { ReturnExchangeService } = await import('../services/returnExchange.service');
    const returnService = new ReturnExchangeService();
    const history = await returnService.getInvoiceTransactions(id);
    res.json({ success: true, data: history });
  });
}

