import { Request, Response, NextFunction } from 'express';
import { SupplierService } from '../services/supplier.service';

const supplierService = new SupplierService();

const asyncHandler =
  (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export class SupplierController {
  // GET /api/suppliers
  getAll = asyncHandler(async (req: Request, res: Response) => {
    const result = await supplierService.getAll(req.query);
    res.json({ success: true, ...result });
  });

  // GET /api/suppliers/stats
  getStats = asyncHandler(async (req: any, res: Response) => {
    const ownerId = req.user?.id || req.query?.ownerId;
    const stats = await supplierService.getStats(ownerId);
    res.json({ success: true, data: stats });
  });

  // GET /api/suppliers/:id
  getById = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const supplier = await supplierService.getById(id);
    res.json({ success: true, data: supplier });
  });

  // GET /api/suppliers/:id/profile
  getFullProfile = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const profile = await supplierService.getFullProfile(id);
    res.json({ success: true, data: profile });
  });

  // POST /api/suppliers
  create = asyncHandler(async (req: Request, res: Response) => {
    const supplier = await supplierService.create(req.body);
    res.status(201).json({ success: true, data: supplier });
  });

  // PUT /api/suppliers/:id
  update = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const supplier = await supplierService.update(id, req.body);
    res.json({ success: true, data: supplier });
  });

  // DELETE /api/suppliers/:id
  delete = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await supplierService.delete(id);
    res.json({ success: true, message: 'Đã xóa nhà cung cấp' });
  });
}
