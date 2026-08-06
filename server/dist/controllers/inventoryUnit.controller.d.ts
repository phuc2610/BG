import { Request, Response, NextFunction } from 'express';
export declare class InventoryUnitController {
    getAll: (req: Request, res: Response, next: NextFunction) => void;
    getGroupedInventory: (req: Request, res: Response, next: NextFunction) => void;
    getGroupedByCondition: (req: Request, res: Response, next: NextFunction) => void;
    getUnitsByProduct: (req: Request, res: Response, next: NextFunction) => void;
    getById: (req: Request, res: Response, next: NextFunction) => void;
    updateCondition: (req: Request, res: Response, next: NextFunction) => void;
    updateListPrice: (req: Request, res: Response, next: NextFunction) => void;
}
//# sourceMappingURL=inventoryUnit.controller.d.ts.map