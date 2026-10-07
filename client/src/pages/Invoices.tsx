import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn, formatCurrency, formatDate, invoiceStatusColors } from '@/lib/utils';
import { InvoiceStatus } from '@/types';
import type { Invoice, InvoiceStats } from '@/types';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Search, Receipt, Plus, Eye, Trash2, ChevronLeft, ChevronRight,
  TrendingUp, CreditCard, AlertCircle, FileCheck, Calendar, DollarSign,
  User, ArrowRight, ShieldCheck, CheckCircle2, Printer,
} from 'lucide-react';

export function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Date Filter State
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | 'this_month' | 'last_month' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const handlePresetChange = (preset: 'all' | 'today' | 'yesterday' | 'this_month' | 'last_month' | 'custom') => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = yest.toISOString().split('T')[0];
      setStartDate(yestStr);
      setEndDate(yestStr);
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (preset === 'last_month') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      setStartDate(firstDayLastMonth);
      setEndDate(lastDayLastMonth);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: currentPage,
        limit: 15,
      };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const [res, statsRes] = await Promise.all([
        api.get('/invoices', { params }),
        api.get('/invoices/stats', { params: { startDate, endDate } }),
      ]);

      setInvoices(res.data.data);
      setTotalItems(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
      setStats(statsRes.data.data);
    } catch {
      toast.error('Không thể tải danh sách hóa đơn');
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, statusFilter, startDate, endDate]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleCancelInvoice = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const reason = prompt('Nhập lý do hủy hóa đơn này:');
    if (reason === null) return;
    try {
      await api.post(`/invoices/${id}/cancel`, { reason });
      toast.success('Đã hủy hóa đơn');
      fetchInvoices();
    } catch {
      toast.error('Không thể hủy hóa đơn');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hóa Đơn Bán Hàng</h1>
          <p className="text-sm text-[rgb(var(--muted-foreground))] mt-1">
            Quản lý hóa đơn bán hàng nội bộ, công nợ phải thu và lịch sử thanh toán
          </p>
        </div>
      </div>

      {/* Summary Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[rgb(var(--muted-foreground))] uppercase">Tổng Doanh Thu</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-[rgb(var(--foreground))] mt-2">{formatCurrency(stats.totalRevenue)}</p>
            <p className="text-[11px] text-[rgb(var(--muted-foreground))] mt-1">{stats.totalInvoices} hóa đơn bán hàng</p>
          </div>

          <div className="p-4 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[rgb(var(--muted-foreground))] uppercase">Đã Thanh Toán</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-emerald-500 mt-2">{formatCurrency(stats.totalPaid)}</p>
            <p className="text-[11px] text-[rgb(var(--muted-foreground))] mt-1">Số tiền đã thu về quỹ</p>
          </div>

          <div className="p-4 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[rgb(var(--muted-foreground))] uppercase">Công Nợ Còn Nợ</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-amber-500 mt-2">{formatCurrency(stats.totalReceivables)}</p>
            <p className="text-[11px] text-[rgb(var(--muted-foreground))] mt-1">Khoản tiền còn phải thu</p>
          </div>

          <div className="p-4 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[rgb(var(--muted-foreground))] uppercase">Lợi Nhuận</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-purple-400 mt-2">{formatCurrency(stats.totalProfit || 0)}</p>
            <p className="text-[11px] text-[rgb(var(--muted-foreground))] mt-1">Tổng lợi nhuận thực tế</p>
          </div>
        </div>
      )}

      {/* Filters Bar & Date Filter Controls */}
      <div className="p-4 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 flex-wrap border-b border-[rgb(var(--border))] pb-3">
          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 min-w-0 w-full sm:w-auto">
            <span className="text-xs font-bold text-[rgb(var(--muted-foreground))] mr-1 flex items-center gap-1 flex-shrink-0">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">Lọc doanh thu:</span>
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => handlePresetChange('all')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0',
                datePreset === 'all'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]'
              )}
            >
              Tất cả thời gian
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('today')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0',
                datePreset === 'today'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]'
              )}
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('yesterday')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0',
                datePreset === 'yesterday'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]'
              )}
            >
              Hôm qua
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('this_month')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0',
                datePreset === 'this_month'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]'
              )}
            >
              Tháng này
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('last_month')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0',
                datePreset === 'last_month'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]'
              )}
            >
              Tháng trước
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('custom')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0',
                datePreset === 'custom'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]'
              )}
            >
              Tùy chọn ngày
            </button>
            </div>
          </div>

          {/* Custom Date Pickers */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[rgb(var(--muted-foreground))] font-medium">Từ ngày:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
              />
              <span className="text-[rgb(var(--muted-foreground))] font-medium">Đến ngày:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
              />
            </div>
          )}
        </div>

        {/* Search & Status Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-0 w-full sm:min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted-foreground))]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã HĐ, tên khách, SĐT, Serial..."
              className={cn(
                'w-full pl-10 pr-4 py-2 rounded-xl text-sm',
                'bg-[rgb(var(--background))] border border-[rgb(var(--border))]',
                'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50',
                'transition-smooth'
              )}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] focus:outline-none w-full sm:w-auto"
          >
            <option value="">Tất cả trạng thái</option>
            {Object.values(InvoiceStatus).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* DataTable List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
              <div className="skeleton w-1/3 h-5 mb-2" />
              <div className="skeleton w-1/4 h-4" />
            </div>
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-20 text-[rgb(var(--muted-foreground))]">
          <Receipt className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Chưa có hóa đơn bán hàng nào</p>
          <p className="text-sm mt-1">
            Vào danh sách <strong>"Báo Giá"</strong>, chọn đơn đã chốt và bấm <strong>"Tạo Hóa Đơn Bán Hàng"</strong> để tạo mới.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] overflow-hidden shadow-sm">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[rgb(var(--muted))]/50 border-b border-[rgb(var(--border))] text-[11px] font-semibold text-[rgb(var(--muted-foreground))] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Mã Hóa Đơn</th>
                  <th className="px-4 py-3">Ngày Lập</th>
                  <th className="px-4 py-3">Khách Hàng</th>
                  <th className="px-4 py-3 text-center">Số SP</th>
                  <th className="px-4 py-3 text-right">Tổng Tiền</th>
                  <th className="px-4 py-3 text-right">Đã Thanh Toán</th>
                  <th className="px-4 py-3 text-right">Còn Nợ</th>
                  <th className="px-4 py-3 text-center">Trạng Thái</th>
                  <th className="px-4 py-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--border))]">
                {invoices.map((inv) => {
                  const isDebt = inv.remainingAmount > 0;
                  return (
                    <tr
                      key={inv._id}
                      onClick={() => navigate(`/invoices/${inv._id}`)}
                      className="hover:bg-[rgb(var(--accent))] transition-smooth cursor-pointer"
                    >
                      <td className="px-4 py-3.5 font-bold font-mono text-blue-500">
                        {inv.invoiceCode}
                        {inv.quoteCode && (
                          <span className="block text-[10px] text-[rgb(var(--muted-foreground))] font-normal">
                            Từ: {inv.quoteCode}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[rgb(var(--muted-foreground))]">
                        {formatDate(inv.createdDate)}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-sm">{inv.customer.name}</p>
                        <p className="text-xs text-[rgb(var(--muted-foreground))]">{inv.customer.phone || '---'}</p>
                      </td>
                      <td className="px-4 py-3.5 text-center font-semibold">
                        {inv.items.length}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold">
                        {formatCurrency(inv.grandTotal)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-emerald-500">
                        {formatCurrency(inv.totalPaid)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold">
                        <span className={isDebt ? 'text-amber-500' : 'text-[rgb(var(--muted-foreground))]'}>
                          {formatCurrency(inv.remainingAmount)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={cn('px-2.5 py-1 rounded-lg text-xs font-bold border', invoiceStatusColors[inv.status] || '')}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const apiUrl = import.meta.env.VITE_API_URL || '/api';
                              window.open(`${apiUrl}/pdf/invoices/${inv._id}/html`, '_blank');
                            }}
                            className="p-1.5 rounded-lg hover:bg-blue-500/10 text-blue-500"
                            title="In hóa đơn trực tiếp"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/invoices/${inv._id}`)}
                            className="p-1.5 rounded-lg hover:bg-[rgb(var(--accent))] text-blue-500"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {inv.status !== InvoiceStatus.CANCELLED && (
                            <button
                              onClick={(e) => handleCancelInvoice(inv._id, e)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500"
                              title="Hủy hóa đơn"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-[rgb(var(--border))]">
            {invoices.map((inv) => {
              const isDebt = inv.remainingAmount > 0;
              return (
                <div
                  key={inv._id}
                  onClick={() => navigate(`/invoices/${inv._id}`)}
                  className="p-4 active:bg-[rgb(var(--accent))] cursor-pointer transition-smooth"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold font-mono text-blue-500 text-sm">{inv.invoiceCode}</p>
                      {inv.quoteCode && (
                        <p className="text-[10px] text-[rgb(var(--muted-foreground))]">Từ: {inv.quoteCode}</p>
                      )}
                      <p className="text-xs text-[rgb(var(--muted-foreground))] mt-0.5">{formatDate(inv.createdDate)}</p>
                    </div>
                    <span className={cn('px-2.5 py-1 rounded-lg text-[10px] font-bold border flex-shrink-0', invoiceStatusColors[inv.status] || '')}>
                      {inv.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <p className="font-semibold text-sm">{inv.customer.name}</p>
                    <p className="text-xs text-[rgb(var(--muted-foreground))]">{inv.items.length} SP</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div>
                      <p className="text-[10px] text-[rgb(var(--muted-foreground))] uppercase">Tổng Tiền</p>
                      <p className="text-xs font-bold">{formatCurrency(inv.grandTotal)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[rgb(var(--muted-foreground))] uppercase">Đã Thu</p>
                      <p className="text-xs font-bold text-emerald-500">{formatCurrency(inv.totalPaid)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[rgb(var(--muted-foreground))] uppercase">Còn Nợ</p>
                      <p className={cn('text-xs font-bold', isDebt ? 'text-amber-500' : 'text-[rgb(var(--muted-foreground))]')}>
                        {formatCurrency(inv.remainingAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-[rgb(var(--border))]" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const apiUrl = import.meta.env.VITE_API_URL || '/api';
                        window.open(`${apiUrl}/pdf/invoices/${inv._id}/html`, '_blank');
                      }}
                      className="p-2 rounded-lg hover:bg-blue-500/10 text-blue-500"
                      title="In hóa đơn trực tiếp"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/invoices/${inv._id}`)}
                      className="p-2 rounded-lg hover:bg-[rgb(var(--accent))] text-blue-500"
                      title="Xem chi tiết"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {inv.status !== InvoiceStatus.CANCELLED && (
                      <button
                        onClick={(e) => handleCancelInvoice(inv._id, e)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-red-500"
                        title="Hủy hóa đơn"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-[rgb(var(--border))] flex-wrap gap-3">
          <p className="text-xs text-[rgb(var(--muted-foreground))]">
            Trang {currentPage} / {totalPages} ({totalItems} hóa đơn)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
