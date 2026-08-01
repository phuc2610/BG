import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

export function MainLayout() {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div
        className={cn(
          'transition-all duration-300 ease-out',
          sidebarCollapsed
            ? 'ml-[var(--sidebar-collapsed-width)]'
            : 'ml-[var(--sidebar-width)]'
        )}
      >
        <Header />
        <main className="p-6 min-h-[calc(100vh-var(--header-height))]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
