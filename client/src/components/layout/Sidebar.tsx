import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  FileText,
  Receipt,
  Users,
  Building2,
  Truck,
  ShieldCheck,
  Scale,
  Settings,
  ChevronLeft,
  ChevronRight,
  Monitor,
  LogOut,
  ShieldAlert,
  X,
} from 'lucide-react';

const navItemsConfig = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { path: '/customers', label: 'Khách Hàng', icon: Users, permission: 'customer.view' },
  { path: '/suppliers', label: 'Nhà Cung Cấp', icon: Building2, permission: 'supplier.view' },
  { path: '/purchases', label: 'Nhập Hàng', icon: Truck, permission: 'purchase.view' },
  { path: '/products', label: 'Mã Sản Phẩm', icon: Package, permission: 'product.view' },
  { path: '/inventory', label: 'Tồn Kho (Mã SP)', icon: Warehouse, permission: 'inventory.view' },
  { path: '/supplier-warranties', label: 'Bảo Hành NCC', icon: ShieldCheck, permission: 'warranty.supplier.view' },
  { path: '/quotes', label: 'Báo Giá', icon: FileText, permission: 'quote.view' },
  { path: '/invoices', label: 'Hóa Đơn', icon: Receipt, permission: 'invoice.view' },
  { path: '/debts', label: 'Công Nợ Khách', icon: Scale, permission: 'customer.debt.view' },
  { path: '/settings', label: 'Cài Đặt', icon: Settings, permission: 'settings.view' },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, setMobileSidebarOpen } = useUIStore();
  const { user, logout, hasPermission } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    // Close mobile drawer on nav click
    setMobileSidebarOpen(false);
  };

  const visibleNavItems = navItemsConfig.filter((item) => hasPermission(item.permission));

  if (user?.role === 'ADMIN') {
    visibleNavItems.push({
      path: '/admin',
      label: 'Quản Trị Hệ Thống',
      icon: ShieldAlert,
      permission: '*',
    });
  }

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <aside
      className={cn(
        'flex flex-col border-r h-full',
        'bg-[rgb(var(--card))] border-[rgb(var(--border))]',
        isMobile
          ? 'w-[260px]'
          : cn(
              'fixed top-0 left-0 h-screen z-30 transition-all duration-300 ease-out',
              sidebarCollapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]'
            )
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-[var(--header-height)] border-b border-[rgb(var(--border))] flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
          <Monitor className="w-5 h-5 text-white" />
        </div>
        {(!sidebarCollapsed || isMobile) && (
          <div className="animate-fade-in flex-1 min-w-0">
            <h1 className="text-sm font-bold tracking-tight text-[rgb(var(--foreground))]">
              NP Computer
            </h1>
            <p className="text-[10px] text-[rgb(var(--muted-foreground))] -mt-0.5">
              Kho Chung & Phân Quyền
            </p>
          </div>
        )}
        {isMobile && (
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-1.5 rounded-lg text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--accent))] transition-smooth flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={isMobile ? handleNavClick : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-smooth group',
                isActive
                  ? 'bg-blue-500/10 text-blue-500'
                  : 'text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] hover:bg-[rgb(var(--accent))]',
                !isMobile && sidebarCollapsed && 'justify-center px-0'
              )}
            >
              <item.icon
                className={cn(
                  'w-5 h-5 flex-shrink-0 transition-smooth',
                  isActive ? 'text-blue-500' : 'group-hover:text-[rgb(var(--foreground))]'
                )}
              />
              {(!sidebarCollapsed || isMobile) && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="px-3 py-3 border-t border-[rgb(var(--border))] space-y-2 flex-shrink-0">
        {(!sidebarCollapsed || isMobile) && (
          <div className="px-2 py-1.5 rounded-xl bg-[rgb(var(--muted))/50] flex items-center justify-between text-xs">
            <div className="truncate">
              <div className="font-bold text-[rgb(var(--foreground))] truncate">{user?.username || 'User'}</div>
              <div className="text-[10px] text-emerald-500 font-semibold">
                {user?.role === 'ADMIN' ? 'Admin Toàn Quyền' : 'Tài khoản Active'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-smooth flex-shrink-0"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
        {!isMobile && (
          <button
            onClick={toggleSidebar}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs',
              'text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]',
              'hover:bg-[rgb(var(--accent))] transition-smooth'
            )}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Thu gọn</span>
              </>
            )}
          </button>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar — always visible on lg+ */}
      <div className="hidden lg:block">
        <SidebarContent isMobile={false} />
      </div>

      {/* Mobile/Tablet Drawer */}
      {mobileSidebarOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed top-0 left-0 h-screen z-50 lg:hidden animate-slide-in-left">
            <SidebarContent isMobile={true} />
          </div>
        </>
      )}
    </>
  );
}
