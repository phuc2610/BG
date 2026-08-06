import { Request, Response } from 'express';
import { QuoteService } from '../services/quote.service';
import { asyncHandler } from '../middleware';

const quoteService = new QuoteService();

export class QuoteController {
  // GET /api/quotes
  getAll = asyncHandler(async (req: Request, res: Response) => {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const search = req.query.search as string;
    const status = req.query.status as any;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const result = await quoteService.getAll({
      page,
      limit,
      search,
      status,
      startDate,
      endDate,
    });

    res.json({ success: true, ...result });
  });

  // GET /api/quotes/:id
  getById = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const quote = await quoteService.getById(id);
    res.json({ success: true, data: quote });
  });

  // POST /api/quotes
  create = asyncHandler(async (req: Request, res: Response) => {
    const creatorName = (req as any).user?.fullName || (req as any).user?.username || req.body.createdBy;
    const quote = await quoteService.create({
      ...req.body,
      createdBy: creatorName,
    });
    res.status(201).json({ success: true, data: quote });
  });

  // PUT /api/quotes/:id
  update = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const quote = await quoteService.update(id, req.body);
    res.json({ success: true, data: quote });
  });

  // DELETE /api/quotes/:id
  delete = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await quoteService.delete(id);
    res.json({ success: true, message: 'Đã xóa báo giá' });
  });

  // POST /api/quotes/:id/products
  addProduct = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { inventoryItem, unitPrice, quantity, warranty, serialNumber, condition } = req.body;
    const quote = await quoteService.addInventoryItem(
      id,
      inventoryItem,
      unitPrice,
      quantity,
      warranty,
      serialNumber,
      condition
    );
    res.json({ success: true, data: quote });
  });

  // DELETE /api/quotes/:id/items/:itemId
  removeProduct = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const itemId = Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId;
    const quote = await quoteService.removeProduct(id, itemId);
    res.json({ success: true, data: quote });
  });

  // PATCH /api/quotes/:id/items/:itemId
  updateItem = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const itemId = Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId;
    const quote = await quoteService.updateItem(
      id,
      itemId,
      req.body
    );
    res.json({ success: true, data: quote });
  });

  // PATCH /api/quotes/:id/status
  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const quote = await quoteService.updateStatus(id, req.body.status);
    res.json({ success: true, data: quote });
  });
}
