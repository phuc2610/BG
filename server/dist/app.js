"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
const database_1 = require("./config/database");
const middleware_1 = require("./middleware");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
// Import routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const inventory_routes_1 = __importDefault(require("./routes/inventory.routes"));
const quote_routes_1 = __importDefault(require("./routes/quote.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const settings_routes_1 = __importDefault(require("./routes/settings.routes"));
const pdf_routes_1 = __importDefault(require("./routes/pdf.routes"));
const invoice_routes_1 = __importDefault(require("./routes/invoice.routes"));
const customer_routes_1 = __importDefault(require("./routes/customer.routes"));
const debt_routes_1 = __importDefault(require("./routes/debt.routes"));
const supplier_routes_1 = __importDefault(require("./routes/supplier.routes"));
const purchase_routes_1 = __importDefault(require("./routes/purchase.routes"));
const inventoryUnit_routes_1 = __importDefault(require("./routes/inventoryUnit.routes"));
const auth_middleware_1 = require("./middleware/auth.middleware");
const app = (0, express_1.default)();
// Middleware
app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use((0, cors_1.default)({ origin: config_1.config.clientUrl, credentials: true }));
app.use((0, morgan_1.default)('dev'));
app.use((0, cookie_parser_1.default)());
// Serve uploaded images statically
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Public Auth & Admin routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
// Protected USER operational routes
app.use('/api/products', auth_middleware_1.authenticateUser, product_routes_1.default);
app.use('/api/inventory', auth_middleware_1.authenticateUser, inventory_routes_1.default);
app.use('/api/inventory-units', auth_middleware_1.authenticateUser, inventoryUnit_routes_1.default);
app.use('/api/quotes', auth_middleware_1.authenticateUser, quote_routes_1.default);
app.use('/api/invoices', auth_middleware_1.authenticateUser, invoice_routes_1.default);
app.use('/api/customers', auth_middleware_1.authenticateUser, customer_routes_1.default);
app.use('/api/suppliers', auth_middleware_1.authenticateUser, supplier_routes_1.default);
app.use('/api/purchases', auth_middleware_1.authenticateUser, purchase_routes_1.default);
app.use('/api/debts', auth_middleware_1.authenticateUser, debt_routes_1.default);
app.use('/api/dashboard', auth_middleware_1.authenticateUser, dashboard_routes_1.default);
app.use('/api/settings', auth_middleware_1.authenticateUser, settings_routes_1.default);
app.use('/api/pdf', pdf_routes_1.default);
// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Error handler
app.use(middleware_1.errorHandler);
// Start server
const startServer = async () => {
    await (0, database_1.connectDB)();
    app.listen(config_1.config.port, () => {
        console.log(`🚀 Server running on http://localhost:${config_1.config.port}`);
        console.log(`📝 API: http://localhost:${config_1.config.port}/api`);
        console.log(`🔧 Environment: ${config_1.config.nodeEnv}`);
    });
};
startServer().catch(console.error);
exports.default = app;
//# sourceMappingURL=app.js.map