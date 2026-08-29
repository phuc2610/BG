"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const models_1 = require("../models");
const types_1 = require("../types");
const middleware_1 = require("../middleware");
class DashboardController {
    // GET /api/dashboard/stats
    getStats = (0, middleware_1.asyncHandler)(async (req, res) => {
        const { startDate, endDate } = req.query;
        const invoiceFilter = { isFinalized: true };
        if (startDate || endDate) {
            const dateCond = {};
            if (startDate)
                dateCond.$gte = new Date(startDate);
            if (endDate)
                dateCond.$lte = new Date(endDate);
            invoiceFilter.$or = [
                { finalizedAt: dateCond },
                { finalizedAt: { $exists: false }, createdDate: dateCond },
            ];
        }
        // 1. Finalized Invoices (Filtered by date range)
        const finalizedInvoices = await models_1.Invoice.find(invoiceFilter).exec();
        const totalRevenue = finalizedInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
        const totalCostOfSold = finalizedInvoices.reduce((sum, inv) => sum + (inv.totalCost || 0), 0);
        const totalProfit = finalizedInvoices.reduce((sum, inv) => sum + (inv.profit || 0), 0);
        // 2. Current Stock Valuation (Total cost spent on available/reserved in-stock items)
        const inStockUnits = await models_1.InventoryUnit.find({
            status: { $in: [types_1.InventoryUnitStatus.AVAILABLE, types_1.InventoryUnitStatus.RESERVED] },
        }).exec();
        const totalStockValuation = inStockUnits.reduce((sum, u) => sum + (u.purchasePrice || 0), 0);
        // 3. Debt Stats
        const customers = await models_1.Customer.find({}).exec();
        const totalCustomerDebt = customers.reduce((sum, c) => sum + (c.totalDebt || 0), 0);
        const suppliers = await models_1.Supplier.find({}).exec();
        const totalSupplierDebt = suppliers.reduce((sum, s) => sum + (s.totalDebt || 0), 0);
        const products = await models_1.Product.find({}).exec();
        const totalProducts = products.length;
        // Aggregate in-stock physical inventory quantity by category
        const productCategoryMap = new Map();
        for (const p of products) {
            if (p.category) {
                productCategoryMap.set(p._id.toString(), p.category);
            }
        }
        const byCategory = {};
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
    getRecent = (0, middleware_1.asyncHandler)(async (req, res) => {
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;
        const products = await models_1.Product.find({}).sort({ createdAt: -1 }).limit(limit).exec();
        res.json({ success: true, data: products });
    });
}
exports.DashboardController = DashboardController;
//# sourceMappingURL=dashboard.controller.js.map