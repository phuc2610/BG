import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { config } from './config';
import { connectDB } from './config/database';
import { errorHandler } from './middleware';

import cookieParser from 'cookie-parser';

// Import routes
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import productRoutes from './routes/product.routes';
import inventoryRoutes from './routes/inventory.routes';
import quoteRoutes from './routes/quote.routes';
import dashboardRoutes from './routes/dashboard.routes';
import settingsRoutes from './routes/settings.routes';
import pdfRoutes from './routes/pdf.routes';
import invoiceRoutes from './routes/invoice.routes';
import customerRoutes from './routes/customer.routes';
import debtRoutes from './routes/debt.routes';
import supplierRoutes from './routes/supplier.routes';
import purchaseRoutes from './routes/purchase.routes';
import inventoryUnitRoutes from './routes/inventoryUnit.routes';
import { authenticateUser } from './middleware/auth.middleware';

const app = express();

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(morgan('dev'));
app.use(cookieParser());
// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Public Auth & Admin routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Protected USER operational routes
app.use('/api/products', authenticateUser, productRoutes);
app.use('/api/inventory', authenticateUser, inventoryRoutes);
app.use('/api/inventory-units', authenticateUser, inventoryUnitRoutes);
app.use('/api/quotes', authenticateUser, quoteRoutes);
app.use('/api/invoices', authenticateUser, invoiceRoutes);
app.use('/api/customers', authenticateUser, customerRoutes);
app.use('/api/suppliers', authenticateUser, supplierRoutes);
app.use('/api/purchases', authenticateUser, purchaseRoutes);
app.use('/api/debts', authenticateUser, debtRoutes);
app.use('/api/dashboard', authenticateUser, dashboardRoutes);
app.use('/api/settings', authenticateUser, settingsRoutes);
app.use('/api/pdf', pdfRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(config.port, () => {
    console.log(`🚀 Server running on http://localhost:${config.port}`);
    console.log(`📝 API: http://localhost:${config.port}/api`);
    console.log(`🔧 Environment: ${config.nodeEnv}`);
  });
};

startServer().catch(console.error);

export default app;
