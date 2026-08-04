import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { UserRole } from '../models';

function deepSanitize(obj: any, user: any): any {
  if (obj === null || obj === undefined) return obj;

  // Date, RegExp, ObjectId, Buffers - return as is
  if (
    obj instanceof Date ||
    obj instanceof RegExp ||
    obj._bsontype === 'ObjectId' ||
    (obj.constructor && obj.constructor.name === 'ObjectId')
  ) {
    return obj.toString ? obj.toString() : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepSanitize(item, user));
  }

  if (typeof obj === 'object') {
    const plainObj = typeof obj.toObject === 'function' ? obj.toObject({ getters: true }) : { ...obj };
    const perms: string[] = user.permissions || [];
    const isFullAccess = user.role === UserRole.ADMIN || perms.includes('*');

    // Convert _id to string explicitly if it exists
    if (plainObj._id) {
      plainObj._id = plainObj._id.toString();
    }
    if (plainObj.id) {
      plainObj.id = plainObj.id.toString();
    }

    // 1. Cost Price / Purchase Price / Total Cost
    if (!isFullAccess && !perms.includes('inventory.cost.view') && !perms.includes('purchase.cost.view')) {
      delete plainObj.costPrice;
      delete plainObj.purchasePrice;
      delete plainObj.totalCost;
      delete plainObj.currentStockValuation;
      if (plainObj.productSnapshot) {
        delete plainObj.productSnapshot.costPrice;
      }
    }

    // 2. Supplier Info
    if (!isFullAccess && !perms.includes('inventory.supplier.view') && !perms.includes('supplier.view')) {
      delete plainObj.supplier;
      delete plainObj.supplierId;
      delete plainObj.supplierName;
      if (plainObj.productSnapshot) {
        delete plainObj.productSnapshot.supplier;
      }
    }

    // 3. Profit
    if (!isFullAccess && !perms.includes('dashboard.profit')) {
      delete plainObj.profit;
      delete plainObj.totalProfit;
      delete plainObj.margin;
    }

    // 4. Revenue
    if (!isFullAccess && !perms.includes('dashboard.revenue')) {
      delete plainObj.totalRevenue;
      delete plainObj.monthlyRevenue;
    }

    // Recursively sanitize nested keys
    for (const key of Object.keys(plainObj)) {
      if (key === '_id' || key === 'id') continue;
      if (plainObj[key] && typeof plainObj[key] === 'object') {
        if (plainObj[key]._bsontype === 'ObjectId' || plainObj[key].constructor?.name === 'ObjectId') {
          plainObj[key] = plainObj[key].toString();
          continue;
        }
        plainObj[key] = deepSanitize(plainObj[key], user);
      }
    }

    return plainObj;
  }

  return obj;
}

export const applyFieldLevelSecurity = (req: AuthRequest, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);

  res.json = (body: any): Response => {
    if (req.user && body && typeof body === 'object') {
      if (body.data !== undefined) {
        body.data = deepSanitize(body.data, req.user);
      } else {
        body = deepSanitize(body, req.user);
      }
    }
    return originalJson(body);
  };

  next();
};
