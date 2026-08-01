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
import { Debts } from '@/pages/Debts';
import { Settings } from '@/pages/Settings';
import { Register } from '@/pages/Register';
import { Login } from '@/pages/Login';
import { AdminLogin } from '@/pages/AdminLogin';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { GlobalSearch } from '@/components/shared/GlobalSearch';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';

function UserPrivateRoute() {
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

  if (user.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
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

        {/* Protected User Routes */}
        <Route element={<UserPrivateRoute />}>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/:id" element={<CustomerDetail />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="suppliers/:id" element={<SupplierDetail />} />
            <Route path="purchases" element={<Purchases />} />
            <Route path="purchases/new" element={<PurchaseForm />} />
            <Route path="products" element={<Products />} />
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/:id" element={<ProductForm />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="supplier-warranties" element={<SupplierWarranty />} />
            <Route path="quotes" element={<Quotes />} />
            <Route path="quotes/new" element={<QuoteForm />} />
            <Route path="quotes/:id" element={<QuoteForm />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="invoices/:id" element={<InvoiceDetail />} />
            <Route path="debts" element={<Debts />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
