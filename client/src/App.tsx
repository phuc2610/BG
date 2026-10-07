import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { MainLayout } from '@/components/layout/MainLayout';
import { Dashboard } from '@/pages/Dashboard';
import { Products } from '@/pages/Products';
import { ProductForm } from '@/pages/ProductForm';
import { Inventory } from '@/pages/Inventory';
import { Quotes } from '@/pages/Quotes';
import { QuoteForm } from '@/pages/QuoteForm';
import { Invoices } from '@/pages/Invoices';
import { InvoiceDetail } from '@/pages/InvoiceDetail';
import { Customers } from '@/pages/Customers';
import { CustomerDetail } from '@/pages/CustomerDetail';
import { Suppliers } from '@/pages/Suppliers';
import { SupplierDetail } from '@/pages/SupplierDetail';
import { Purchases } from '@/pages/Purchases';
import { PurchaseForm } from '@/pages/PurchaseForm';
import { SupplierWarranty } from '@/pages/SupplierWarranty';
import { WarrantyLookup } from '@/pages/WarrantyLookup';
import { Debts } from '@/pages/Debts';
import { Settings } from '@/pages/Settings';
import { Register } from '@/pages/Register';
import { Login } from '@/pages/Login';
import { AdminLogin } from '@/pages/AdminLogin';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { GlobalSearch } from '@/components/shared/GlobalSearch';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { ShieldAlert } from 'lucide-react';

function ProtectedRoute() {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))] flex items-center justify-center text-xs text-[rgb(var(--muted-foreground))]">
        Đang xác thực tài khoản...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function AdminPrivateRoute() {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-xs">
        Đang xác thực quyền Admin...
      </div>
    );
  }

  if (!isAuthenticated || !user || user.role !== 'ADMIN') {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}

function PermissionGuard({ permissionKey, children }: { permissionKey: string; children: React.ReactNode }) {
  const { hasPermission } = useAuthStore();
  if (!hasPermission(permissionKey)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[rgb(var(--foreground))]">Không có quyền truy cập</h2>
        <p className="text-sm text-[rgb(var(--muted-foreground))] mt-2 max-w-md">
          Bạn không có quyền <code className="text-xs bg-red-500/10 text-red-500 px-2 py-0.5 rounded font-mono">{permissionKey}</code> để sử dụng chức năng này. Vui lòng liên hệ Quản trị viên để được cấp quyền.
        </p>
      </div>
    );
  }
  return children;
}

export default function App() {
  const { theme } = useUIStore();
  const { fetchCurrentUser } = useAuthStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
    fetchCurrentUser();
  }, [theme, fetchCurrentUser]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'bg-[rgb(var(--card))] text-[rgb(var(--foreground))] border border-[rgb(var(--border))] rounded-xl text-sm shadow-xl',
          duration: 3000,
        }}
      />
      <GlobalSearch />
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Protected Admin Routes */}
        <Route element={<AdminPrivateRoute />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        {/* Protected Operational Routes for both USER and ADMIN */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<PermissionGuard permissionKey="dashboard.view"><Dashboard /></PermissionGuard>} />
            <Route path="customers" element={<PermissionGuard permissionKey="customer.view"><Customers /></PermissionGuard>} />
            <Route path="customers/:id" element={<PermissionGuard permissionKey="customer.view"><CustomerDetail /></PermissionGuard>} />
            <Route path="suppliers" element={<PermissionGuard permissionKey="supplier.view"><Suppliers /></PermissionGuard>} />
            <Route path="suppliers/:id" element={<PermissionGuard permissionKey="supplier.view"><SupplierDetail /></PermissionGuard>} />
            <Route path="purchases" element={<PermissionGuard permissionKey="purchase.view"><Purchases /></PermissionGuard>} />
            <Route path="purchases/new" element={<PermissionGuard permissionKey="purchase.create"><PurchaseForm /></PermissionGuard>} />
            <Route path="purchases/edit/:id" element={<PermissionGuard permissionKey="purchase.create"><PurchaseForm /></PermissionGuard>} />
            <Route path="products" element={<PermissionGuard permissionKey="product.view"><Products /></PermissionGuard>} />
            <Route path="products/new" element={<PermissionGuard permissionKey="product.create"><ProductForm /></PermissionGuard>} />
            <Route path="products/:id" element={<PermissionGuard permissionKey="product.edit"><ProductForm /></PermissionGuard>} />
            <Route path="inventory" element={<PermissionGuard permissionKey="inventory.view"><Inventory /></PermissionGuard>} />
            <Route path="supplier-warranties" element={<PermissionGuard permissionKey="warranty.supplier.view"><SupplierWarranty /></PermissionGuard>} />
            <Route path="warranty-lookup" element={<PermissionGuard permissionKey="warranty.supplier.view"><WarrantyLookup /></PermissionGuard>} />
            <Route path="quotes" element={<PermissionGuard permissionKey="quote.view"><Quotes /></PermissionGuard>} />
            <Route path="quotes/new" element={<PermissionGuard permissionKey="quote.create"><QuoteForm /></PermissionGuard>} />
            <Route path="quotes/:id" element={<PermissionGuard permissionKey="quote.view"><QuoteForm /></PermissionGuard>} />
            <Route path="invoices" element={<PermissionGuard permissionKey="invoice.view"><Invoices /></PermissionGuard>} />
            <Route path="invoices/:id" element={<PermissionGuard permissionKey="invoice.view"><InvoiceDetail /></PermissionGuard>} />
            <Route path="debts" element={<PermissionGuard permissionKey="customer.debt.view"><Debts /></PermissionGuard>} />
            <Route path="settings" element={<PermissionGuard permissionKey="settings.view"><Settings /></PermissionGuard>} />
          </Route>
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
