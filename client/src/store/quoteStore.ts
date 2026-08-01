import { create } from 'zustand';
import type { Quote, QuoteStatus } from '@/types';
import api from '@/lib/api';

interface QuoteStore {
  quotes: Quote[];
  totalQuotes: number;
  totalPages: number;
  currentPage: number;
  loading: boolean;
  searchQuery: string;
  statusFilter?: string;

  setSearchQuery: (query: string) => void;
  setStatusFilter: (status?: string) => void;
  setCurrentPage: (page: number) => void;
  fetchQuotes: () => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;
  updateQuoteStatus: (id: string, status: QuoteStatus) => Promise<void>;
}

export const useQuoteStore = create<QuoteStore>((set, get) => ({
  quotes: [],
  totalQuotes: 0,
  totalPages: 0,
  currentPage: 1,
  loading: false,
  searchQuery: '',
  statusFilter: undefined,

  setSearchQuery: (query) => set({ searchQuery: query, currentPage: 1 }),
  setStatusFilter: (status) => set({ statusFilter: status, currentPage: 1 }),
  setCurrentPage: (page) => set({ currentPage: page }),

  fetchQuotes: async () => {
    const { currentPage, searchQuery, statusFilter } = get();
    set({ loading: true });
    try {
      const params: Record<string, any> = {
        page: currentPage,
        limit: 20,
      };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/quotes', { params });
      set({
        quotes: res.data.data,
        totalQuotes: res.data.pagination.total,
        totalPages: res.data.pagination.totalPages,
        currentPage: res.data.pagination.page,
      });
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
    } finally {
      set({ loading: false });
    }
  },

  deleteQuote: async (id) => {
    await api.delete(`/quotes/${id}`);
    get().fetchQuotes();
  },

  updateQuoteStatus: async (id, status) => {
    await api.patch(`/quotes/${id}/status`, { status });
    get().fetchQuotes();
  },
}));
