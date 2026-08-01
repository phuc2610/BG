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
  getStats = asyncHandler(async (req: any, res: Response) => {
    const ownerId = req.user?.id || req.query?.ownerId;
    const stats = await invoiceService.getStats(ownerId);
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
    const { createdBy } = req.body;
    const ownerId = (req as any).user?.id || (req.body as any).ownerId;
    const invoice = await invoiceService.createFromQuote(quoteId, createdBy, ownerId);
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
}
