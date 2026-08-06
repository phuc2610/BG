import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

export function MainLayout() {
  const { sidebarCollapsed, setMobileSidebarOpen } = useUIStore();
  const location = useLocation();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname, setMobileSidebarOpen]);

  return (
    <div className="min-h-screen">
      <Sidebar />
      {/* On mobile/tablet (< lg): no left margin, full width.
          On desktop (>= lg): offset by sidebar width. */}
      <div
        className={cn(
          'transition-all duration-300 ease-out min-w-0',
          sidebarCollapsed
            ? 'lg:ml-[var(--sidebar-collapsed-width)]'
            : 'lg:ml-[var(--sidebar-width)]'
        )}
      >
        <Header />
        <main className="p-4 md:p-6 min-h-[calc(100vh-var(--header-height))] max-w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
