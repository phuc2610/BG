import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
export declare const errorHandler: (err: Error, _req: Request, res: Response, _next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const validate: (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => void;
export declare const asyncHandler: (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => (req: Request, res: Response, next: NextFunction) => void;
export * from './auth.middleware';
//# sourceMappingURL=index.d.ts.map