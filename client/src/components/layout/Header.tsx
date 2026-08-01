import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import { Sun, Moon, Search, Command } from 'lucide-react';

export function Header() {
  const { theme, toggleTheme, setGlobalSearchOpen } = useUIStore();

  return (
    <header
      className={cn(
        'h-[var(--header-height)] border-b flex items-center justify-between px-6',
        'bg-[rgb(var(--card))]/80 backdrop-blur-xl border-[rgb(var(--border))]',
        'sticky top-0 z-20'
      )}
    >
      {/* Search */}
      <button
        onClick={() => setGlobalSearchOpen(true)}
        className={cn(
          'flex items-center gap-3 px-4 py-2 rounded-xl text-sm',
          'bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))]',
          'hover:bg-[rgb(var(--accent))] transition-smooth',
          'w-full max-w-md'
        )}
      >
        <Search className="w-4 h-4" />
        <span className="flex-1 text-left">Tìm kiếm sản phẩm, báo giá...</span>
        <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[rgb(var(--background))] text-[10px] font-mono text-[rgb(var(--muted-foreground))] border border-[rgb(var(--border))]">
          <Command className="w-3 h-3" />K
        </kbd>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-4">
        <button
          onClick={toggleTheme}
          className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center',
            'hover:bg-[rgb(var(--accent))] transition-smooth',
            'text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]'
          )}
          title={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
          A
        </div>
      </div>
    </header>
  );
}
