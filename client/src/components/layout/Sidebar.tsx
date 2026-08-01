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
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/customers', label: 'Khách Hàng', icon: Users },
  { path: '/suppliers', label: 'Nhà Cung Cấp', icon: Building2 },
  { path: '/purchases', label: 'Nhập Hàng', icon: Truck },
  { path: '/products', label: 'Mã Sản Phẩm', icon: Package },
  { path: '/inventory', label: 'Tồn Kho (Mã SP)', icon: Warehouse },
  { path: '/supplier-warranties', label: 'Bảo Hành NCC', icon: ShieldCheck },
  { path: '/quotes', label: 'Báo Giá', icon: FileText },
  { path: '/invoices', label: 'Hóa Đơn', icon: Receipt },
  { path: '/debts', label: 'Công Nợ Khách', icon: Scale },
  { path: '/settings', label: 'Cài Đặt', icon: Settings },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 h-screen z-30 flex flex-col border-r transition-all duration-300 ease-out',
        'bg-[rgb(var(--card))] border-[rgb(var(--border))]',
        sidebarCollapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-[var(--header-height)] border-b border-[rgb(var(--border))]">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
          <Monitor className="w-5 h-5 text-white" />
        </div>
        {!sidebarCollapsed && (
          <div className="animate-fade-in">
            <h1 className="text-sm font-bold tracking-tight text-[rgb(var(--foreground))]">
              NP Computer
            </h1>
            <p className="text-[10px] text-[rgb(var(--muted-foreground))] -mt-0.5">
              Quote Manager
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-smooth group',
                isActive
                  ? 'bg-blue-500/10 text-blue-500'
                  : 'text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] hover:bg-[rgb(var(--accent))]',
                sidebarCollapsed && 'justify-center px-0'
              )}
            >
              <item.icon
                className={cn(
                  'w-5 h-5 flex-shrink-0 transition-smooth',
                  isActive ? 'text-blue-500' : 'group-hover:text-[rgb(var(--foreground))]'
                )}
              />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="px-3 py-3 border-t border-[rgb(var(--border))] space-y-2">
        {!sidebarCollapsed && (
          <div className="px-2 py-1.5 rounded-xl bg-[rgb(var(--muted))/50] flex items-center justify-between text-xs">
            <div className="truncate">
              <div className="font-bold text-[rgb(var(--foreground))] truncate">{user?.username || 'User'}</div>
              <div className="text-[10px] text-emerald-500 font-semibold">Tài khoản Active</div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-smooth"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
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
      </div>
    </aside>
  );
}
