import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models';
export interface AuthRequest extends Request {
    user?: {
        id: string;
        username: string;
        role: UserRole;
    };
}
export declare const authenticateUser: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const requireAdmin: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=auth.middleware.d.ts.map