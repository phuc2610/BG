import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn, formatCurrency, formatDate, quoteStatusColors, debounce } from '@/lib/utils';
import { useQuoteStore } from '@/store/quoteStore';
import { QuoteStatus } from '@/types';
import {
  Search, Plus, FileText, ChevronLeft, ChevronRight,
  MoreHorizontal, Edit, Trash2, Download, Send, Check,
  XCircle, X, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export function Quotes() {
  const navigate = useNavigate();
  const {
    quotes, totalQuotes, totalPages, currentPage, loading,
    searchQuery, statusFilter,
    setSearchQuery, setStatusFilter, setCurrentPage, fetchQuotes,
    deleteQuote, updateQuoteStatus,
  } = useQuoteStore();

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const debouncedSearch = useCallback(
    debounce((value: string) => setSearchQuery(value), 300),
    []
  );

  useEffect(() => {
    fetchQuotes();
  }, [currentPage, searchQuery, statusFilter]);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    debouncedSearch(value);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa báo giá này?')) return;
    try {
      await deleteQuote(id);
      toast.success('Đã xóa báo giá');
    } catch {
      toast.error('Không thể xóa');
    }
  };

  const handleDownloadPdf = async (id: string, quoteCode: string) => {
    setDownloading(id);
    try {
      const res = await api.get(`/pdf/quotes/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${quoteCode}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Đã tải PDF');
    } catch {
      toast.error('Không thể tải PDF');
    } finally {
      setDownloading(null);
    }
  };

  const statusTabs = [
    { label: 'Tất cả', value: undefined },
    ...Object.values(QuoteStatus).map((s) => ({ label: s, value: s })),
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Báo giá</h1>
          <p className="text-sm text-[rgb(var(--muted-foreground))] mt-1">{totalQuotes} báo giá</p>
        </div>
        <button
          onClick={() => navigate('/quotes/new')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-medium hover:opacity-90 transition-smooth shadow-lg shadow-blue-500/25"
        >
          <Plus className="w-4 h-4" />
          Tạo báo giá
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted-foreground))]" />
        <input
          type="text"
          value={localSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Tìm theo mã báo giá, tên khách, SĐT..."
          className={cn(
            'w-full max-w-lg pl-10 pr-4 py-2.5 rounded-xl text-sm',
            'bg-[rgb(var(--muted))] border border-[rgb(var(--border))]',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50',
            'transition-smooth'
          )}
        />
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setStatusFilter(tab.value)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-smooth',
              statusFilter === tab.value
                ? 'bg-blue-500/10 text-blue-500'
                : 'text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--accent))]'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Quotes List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
              <div className="flex items-center gap-4">
                <div className="skeleton w-32 h-5" />
                <div className="skeleton w-40 h-4" />
                <div className="flex-1" />
                <div className="skeleton w-24 h-5" />
              </div>
            </div>
          ))}
        </div>
      ) : quotes.length === 0 ? (
        <div className="text-center py-20 text-[rgb(var(--muted-foreground))]">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Chưa có báo giá nào</p>
          <button
            onClick={() => navigate('/quotes/new')}
            className="mt-3 text-sm text-blue-500 hover:text-blue-400"
          >
            Tạo báo giá đầu tiên →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {quotes.map((quote, i) => (
            <div
              key={quote._id}
              className={cn(
                'rounded-2xl border p-5 transition-smooth cursor-pointer',
                'bg-[rgb(var(--card))] border-[rgb(var(--border))]',
                'hover:border-blue-500/30 hover:shadow-lg',
                'animate-fade-in'
              )}
              style={{ animationDelay: `${i * 0.03}s`, opacity: 0 }}
              onClick={() => navigate(`/quotes/${quote._id}`)}
            >
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{quote.quoteCode}</p>
                    <p className="text-xs text-[rgb(var(--muted-foreground))]">
                      {quote.customer.name} {quote.customer.phone ? `• ${quote.customer.phone}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex-1" />

                <p className="text-xs text-[rgb(var(--muted-foreground))]">
                  {formatDate(quote.createdDate)} • {quote.items.length} sản phẩm
                </p>

                <div className={cn('px-2.5 py-1 rounded-lg text-xs font-medium border', quoteStatusColors[quote.status] || '')}>
                  {quote.status}
                </div>

                {quote.invoiceCode && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    HD: {quote.invoiceCode}
                  </span>
                )}

                <p className="text-sm font-bold text-blue-500 w-36 text-right">
                  {formatCurrency(quote.grandTotal)}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleDownloadPdf(quote._id, quote.quoteCode)}
                    disabled={downloading === quote._id}
                    className="p-2 rounded-lg hover:bg-[rgb(var(--accent))] transition-smooth"
                    title="Tải PDF"
                  >
                    {downloading === quote._id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    ) : (
                      <Download className="w-4 h-4 text-[rgb(var(--muted-foreground))]" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(quote._id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 transition-smooth"
                    title="Xóa"
                  >
                    <Trash2 className="w-4 h-4 text-[rgb(var(--muted-foreground))] hover:text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-2 rounded-lg disabled:opacity-30 hover:bg-[rgb(var(--accent))] transition-smooth"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={cn(
                'w-9 h-9 rounded-lg text-sm font-medium transition-smooth',
                currentPage === page ? 'bg-blue-500 text-white' : 'hover:bg-[rgb(var(--accent))]'
              )}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-2 rounded-lg disabled:opacity-30 hover:bg-[rgb(var(--accent))] transition-smooth"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
