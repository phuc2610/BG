import { create } from 'zustand';
import type { Product, ViewMode } from '@/types';
import api from '@/lib/api';

interface ProductStore {
  products: Product[];
  totalProducts: number;
  totalPages: number;
  currentPage: number;
  loading: boolean;
  viewMode: ViewMode;
  searchQuery: string;
  filters: {
    category?: string;
    status?: string;
    condition?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
  };

  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<ProductStore['filters']>) => void;
  setCurrentPage: (page: number) => void;
  fetchProducts: () => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  cloneProduct: (id: string) => Promise<void>;
  updateProductStatus: (id: string, status: string) => Promise<void>;
}

export const useProductStore = create<ProductStore>((set, get) => ({
  products: [],
  totalProducts: 0,
  totalPages: 0,
  currentPage: 1,
  loading: false,
  viewMode: (localStorage.getItem('viewMode') as ViewMode) || 'grid',
  searchQuery: '',
  filters: {},

  setViewMode: (mode) => {
    localStorage.setItem('viewMode', mode);
    set({ viewMode: mode });
  },

  setSearchQuery: (query) => set({ searchQuery: query, currentPage: 1 }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
      currentPage: 1,
    })),

  setCurrentPage: (page) => set({ currentPage: page }),

  fetchProducts: async () => {
    const { currentPage, searchQuery, filters } = get();
    set({ loading: true });
    try {
      const params: Record<string, any> = {
        page: currentPage,
        limit: 20,
      };
      if (searchQuery) params.search = searchQuery;
      if (filters.category) params.category = filters.category;
      if (filters.status) params.status = filters.status;
      if (filters.condition) params.condition = filters.condition;
      if (filters.brand) params.brand = filters.brand;
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;

      const res = await api.get('/products', { params });
      set({
        products: res.data.data,
        totalProducts: res.data.pagination.total,
        totalPages: res.data.pagination.totalPages,
        currentPage: res.data.pagination.page,
      });
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      set({ loading: false });
    }
  },

  deleteProduct: async (id) => {
    await api.delete(`/products/${id}`);
    get().fetchProducts();
  },

  cloneProduct: async (id) => {
    await api.post(`/products/${id}/clone`);
    get().fetchProducts();
  },

  updateProductStatus: async (id, status) => {
    await api.patch(`/products/${id}/status`, { status });
    get().fetchProducts();
  },
}));
