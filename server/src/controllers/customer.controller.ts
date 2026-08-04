import { Request, Response, NextFunction } from 'express';
import { CustomerService } from '../services/customer.service';

const customerService = new CustomerService();

const asyncHandler =
  (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export class CustomerController {
  // GET /api/customers
  getAll = asyncHandler(async (req: Request, res: Response) => {
    const result = await customerService.getAll(req.query);
    res.json({ success: true, ...result });
  });

  // GET /api/customers/stats
  getStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await customerService.getStats();
    res.json({ success: true, data: stats });
  });

  // GET /api/customers/:id
  getById = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const customer = await customerService.getById(id);
    res.json({ success: true, data: customer });
  });

  // GET /api/customers/:id/profile
  getFullProfile = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const profile = await customerService.getFullProfile(id);
    res.json({ success: true, data: profile });
  });

  // POST /api/customers
  create = asyncHandler(async (req: Request, res: Response) => {
    const customer = await customerService.create(req.body, 'Admin');
    res.status(201).json({ success: true, data: customer });
  });

  // PUT /api/customers/:id
  update = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const customer = await customerService.update(id, req.body);
    res.json({ success: true, data: customer });
  });

  // DELETE /api/customers/:id
  delete = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await customerService.delete(id);
    res.json({ success: true, message: 'Đã xóa khách hàng' });
  });
}
