import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface UIStore {
  theme: Theme;
  sidebarCollapsed: boolean;
  globalSearchOpen: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setGlobalSearchOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  theme: (localStorage.getItem('theme') as Theme) || 'dark',
  sidebarCollapsed: false,
  globalSearchOpen: false,

  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', newTheme);
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      document.documentElement.classList.toggle('light', newTheme === 'light');
      return { theme: newTheme };
    }),

  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
    set({ theme });
  },

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  setGlobalSearchOpen: (open) => set({ globalSearchOpen: open }),
}));
