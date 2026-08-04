import { Request, Response } from 'express';
export declare class AuthController {
    register: (req: Request, res: Response, next: import("express").NextFunction) => void;
    login: (req: Request, res: Response, next: import("express").NextFunction) => void;
    adminLogin: (req: Request, res: Response, next: import("express").NextFunction) => void;
    me: (req: Request, res: Response, next: import("express").NextFunction) => void;
    updateProfile: (req: Request, res: Response, next: import("express").NextFunction) => void;
    logout: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
//# sourceMappingURL=auth.controller.d.ts.map