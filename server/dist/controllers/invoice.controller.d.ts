import { Request, Response, NextFunction } from 'express';
export declare class InvoiceController {
    getAll: (req: Request, res: Response, next: NextFunction) => void;
    getStats: (req: Request, res: Response, next: NextFunction) => void;
    getById: (req: Request, res: Response, next: NextFunction) => void;
    createFromQuote: (req: Request, res: Response, next: NextFunction) => void;
    addPayment: (req: Request, res: Response, next: NextFunction) => void;
    updateDraft: (req: Request, res: Response, next: NextFunction) => void;
    selectSerials: (req: Request, res: Response, next: NextFunction) => void;
    finalize: (req: Request, res: Response, next: NextFunction) => void;
    update: (req: Request, res: Response, next: NextFunction) => void;
    cancel: (req: Request, res: Response, next: NextFunction) => void;
    processReturn: (req: Request, res: Response, next: NextFunction) => void;
    processExchange: (req: Request, res: Response, next: NextFunction) => void;
    getReturnExchangeHistory: (req: Request, res: Response, next: NextFunction) => void;
}
//# sourceMappingURL=invoice.controller.d.ts.map