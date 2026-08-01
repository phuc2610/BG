import { Request, Response, NextFunction } from 'express';
import { InventoryService } from '../services/inventory.service';

const inventoryService = new InventoryService();

export class InventoryController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await inventoryService.search(req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const item = await inventoryService.getById(id);
      res.json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const lot = await inventoryService.create(req.body);
      res.status(201).json({ success: true, data: lot });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const lot = await inventoryService.update(id, req.body);
      res.json({ success: true, data: lot });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await inventoryService.delete(id);
      res.json({ success: true, message: 'Đã xóa lô hàng khỏi kho' });
    } catch (error) {
      next(error);
    }
  }
}
