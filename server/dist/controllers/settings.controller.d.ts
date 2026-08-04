import { Request, Response } from 'express';
export declare class SettingsController {
    get: (req: Request, res: Response, next: import("express").NextFunction) => void;
    update: (req: Request, res: Response, next: import("express").NextFunction) => void;
    private uploadAsset;
    uploadLogo: (req: Request, res: Response, next: import("express").NextFunction) => void;
    uploadQR: (req: Request, res: Response, next: import("express").NextFunction) => void;
    uploadSignature: (req: Request, res: Response, next: import("express").NextFunction) => void;
    uploadStamp: (req: Request, res: Response, next: import("express").NextFunction) => void;
    uploadThankYou: (req: Request, res: Response, next: import("express").NextFunction) => void;
    deleteAsset: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
//# sourceMappingURL=settings.controller.d.ts.map