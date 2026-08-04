import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models';
export interface AuthRequest extends Request {
    user?: {
        id: string;
        username: string;
        role: UserRole;
        permissions: string[];
        maxQuoteDiscountPercent: number;
    };
}
export declare const authenticateUser: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const requireAdmin: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const requirePermission: (permissionName: string) => (req: AuthRequest, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
//# sourceMappingURL=auth.middleware.d.ts.map