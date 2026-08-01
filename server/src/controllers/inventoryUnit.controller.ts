import { Request, Response, NextFunction } from 'express';
import { InventoryUnitService } from '../services/inventoryUnit.service';

const unitService = new InventoryUnitService();

const asyncHandler =
  (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export class InventoryUnitController {
  // GET /api/inventory-units
  getAll = asyncHandler(async (req: Request, res: Response) => {
    const result = await unitService.getAll(req.query);
    res.json({ success: true, ...result });
  });

  // GET /api/inventory-units/grouped
  getGroupedInventory = asyncHandler(async (req: Request, res: Response) => {
    const data = await unitService.getGroupedInventory(req.query as any);
    res.json({ success: true, data });
  });

  // GET /api/inventory-units/by-condition
  getGroupedByCondition = asyncHandler(async (req: Request, res: Response) => {
    const data = await unitService.getGroupedInventoryByCondition(req.query as any);
    res.json({ success: true, data });
  });

  // GET /api/inventory-units/by-product/:productId
  getUnitsByProduct = asyncHandler(async (req: any, res: Response) => {
    const productId = Array.isArray(req.params.productId)
      ? req.params.productId[0]
      : req.params.productId;
    const ownerId = req.user?.id || req.query?.ownerId;
    const units = await unitService.getUnitsByProduct(productId, ownerId);
    res.json({ success: true, data: units });
  });

  // GET /api/inventory-units/:id
  getById = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const unit = await unitService.getById(id);
    res.json({ success: true, data: unit });
  });

  // PATCH /api/inventory-units/:id/condition
  updateCondition = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { condition } = req.body;
    const unit = await unitService.updateUnitCondition(id, condition);
    res.json({ success: true, data: unit });
  });
}
