import { Request, Response, NextFunction } from 'express';
import { PurchaseService } from '../services/purchase.service';

const purchaseService = new PurchaseService();

const asyncHandler =
  (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export class PurchaseController {
  // GET /api/purchases
  getAll = asyncHandler(async (req: Request, res: Response) => {
    const result = await purchaseService.getAll(req.query);
    res.json({ success: true, ...result });
  });

  // GET /api/purchases/stats
  getStats = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query as any;
    const stats = await purchaseService.getPurchaseStats(startDate, endDate);
    res.json({ success: true, data: stats });
  });

  // GET /api/purchases/:id
  getById = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const purchase = await purchaseService.getById(id);
    res.json({ success: true, data: purchase });
  });

  // POST /api/purchases
  create = asyncHandler(async (req: Request, res: Response) => {
    const purchase = await purchaseService.create(req.body);
    res.status(201).json({ success: true, data: purchase });
  });

  // POST /api/purchases/:id/payments
  addPayment = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const purchase = await purchaseService.addPayment(id, req.body);
    res.json({ success: true, data: purchase });
  });

  // PUT /api/purchases/:id
  update = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const purchase = await purchaseService.updatePurchase(id, req.body);
    res.json({ success: true, data: purchase });
  });

  // DELETE /api/purchases/:id
  delete = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await purchaseService.deleteDraft(id);
    res.json({ success: true, data: result });
  });
}
