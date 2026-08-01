import { Request, Response } from 'express';
import { Invoice, InventoryUnit, Customer, Supplier, Product } from '../models';
import { InventoryUnitStatus } from '../types';
import { asyncHandler, AuthRequest } from '../middleware';

export class DashboardController {
  // GET /api/dashboard/stats
  getStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ownerId = req.user?.id;
    if (!ownerId) {
      return res.status(401).json({ success: false, message: 'Chưa xác thực người dùng' });
    }

    // 1. Finalized Invoices (Revenue & Count) for current owner
    const finalizedInvoices = await Invoice.find({ ownerId, isFinalized: true }).exec();
    const totalRevenue = finalizedInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

    // 2. COGS (Cost of Goods Sold from SOLD inventory units) for current owner
    const soldUnits = await InventoryUnit.find({ ownerId, status: InventoryUnitStatus.SOLD }).exec();
    const totalCostOfSold = soldUnits.reduce((sum, u) => sum + (u.purchasePrice || 0), 0);

    // 3. Current Stock Valuation (Total cost spent on available/reserved in-stock items) for current owner
    const inStockUnits = await InventoryUnit.find({
      ownerId,
      status: { $in: [InventoryUnitStatus.AVAILABLE, InventoryUnitStatus.RESERVED] },
    }).exec();
    const totalStockValuation = inStockUnits.reduce((sum, u) => sum + (u.purchasePrice || 0), 0);

    // 4. Gross Profit
    const totalProfit = totalRevenue - totalCostOfSold;

    // 5. Debt Stats for current owner
    const customers = await Customer.find({ ownerId }).exec();
    const totalCustomerDebt = customers.reduce((sum, c) => sum + (c.totalDebt || 0), 0);

    const suppliers = await Supplier.find({ ownerId }).exec();
    const totalSupplierDebt = suppliers.reduce((sum, s) => sum + (s.totalDebt || 0), 0);

    const products = await Product.find({ ownerId }).exec();
    const totalProducts = products.length;

    // Aggregate category counts
    const byCategory: Record<string, number> = {};
    for (const p of products) {
      if (p.category) {
        byCategory[p.category] = (byCategory[p.category] || 0) + 1;
      }
    }

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalCost: totalCostOfSold,
        totalStockValuation,
        totalProfit,
        totalCustomerDebt,
        totalSupplierDebt,
        totalFinalizedInvoices: finalizedInvoices.length,
        totalInStockCount: inStockUnits.length,
        totalProducts,
        byCategory,
      },
    });
  });

  // GET /api/dashboard/recent
  getRecent = asyncHandler(async (req: AuthRequest, res: Response) => {
    const ownerId = req.user?.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const products = await Product.find({ ownerId }).sort({ createdAt: -1 }).limit(limit).exec();
    res.json({ success: true, data: products });
  });
}
