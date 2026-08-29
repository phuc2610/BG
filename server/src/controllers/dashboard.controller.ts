import { Request, Response } from 'express';
import { Invoice, InventoryUnit, Customer, Supplier, Product } from '../models';
import { InventoryUnitStatus } from '../types';
import { asyncHandler, AuthRequest } from '../middleware';

export class DashboardController {
  // GET /api/dashboard/stats
  getStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate } = req.query;

    const invoiceFilter: any = { isFinalized: true };

    if (startDate || endDate) {
      const dateCond: any = {};
      if (startDate) dateCond.$gte = new Date(startDate as string);
      if (endDate) dateCond.$lte = new Date(endDate as string);

      invoiceFilter.$or = [
        { finalizedAt: dateCond },
        { finalizedAt: { $exists: false }, createdDate: dateCond },
      ];
    }

    // 1. Finalized Invoices (Filtered by date range)
    const finalizedInvoices = await Invoice.find(invoiceFilter).exec();

    const totalRevenue = finalizedInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
    const totalCostOfSold = finalizedInvoices.reduce((sum, inv) => sum + (inv.totalCost || 0), 0);
    const totalProfit = finalizedInvoices.reduce((sum, inv) => sum + (inv.profit || 0), 0);

    // 2. Current Stock Valuation (Total cost spent on available/reserved in-stock items)
    const inStockUnits = await InventoryUnit.find({
      status: { $in: [InventoryUnitStatus.AVAILABLE, InventoryUnitStatus.RESERVED] },
    }).exec();
    const totalStockValuation = inStockUnits.reduce((sum, u) => sum + (u.purchasePrice || 0), 0);

    // 3. Debt Stats
    const customers = await Customer.find({}).exec();
    const totalCustomerDebt = customers.reduce((sum, c) => sum + (c.totalDebt || 0), 0);

    const suppliers = await Supplier.find({}).exec();
    const totalSupplierDebt = suppliers.reduce((sum, s) => sum + (s.totalDebt || 0), 0);

    const products = await Product.find({}).exec();
    const totalProducts = products.length;

    // Aggregate in-stock physical inventory quantity by category
    const productCategoryMap = new Map<string, string>();
    for (const p of products) {
      if (p.category) {
        productCategoryMap.set(p._id.toString(), p.category);
      }
    }

    const byCategory: Record<string, number> = {};
    for (const u of inStockUnits) {
      const pId = u.productId?.toString();
      const cat = pId ? productCategoryMap.get(pId) : null;
      if (cat) {
        byCategory[cat] = (byCategory[cat] || 0) + 1;
      }
    }

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalCost: totalCostOfSold,
        totalStockValuation,
        totalProfit,
        profitMargin: totalRevenue > 0 ? Number(((totalProfit / totalRevenue) * 100).toFixed(1)) : 0,
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
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const products = await Product.find({}).sort({ createdAt: -1 }).limit(limit).exec();
    res.json({ success: true, data: products });
  });
}
