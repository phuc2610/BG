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
  User, ArrowRight, ShieldCheck, CheckCircle2,
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

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: currentPage,
        limit: 15,
      };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;

      const [res, statsRes] = await Promise.all([
        api.get('/invoices', { params }),
        api.get('/invoices/stats'),
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
  }, [currentPage, search, statusFilter]);

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
      <div className="flex items-center justify-between">
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
              <span className="text-xs font-semibold text-[rgb(var(--muted-foreground))] uppercase">Giá Trị TB / Đơn</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-[rgb(var(--foreground))] mt-2">{formatCurrency(stats.averageInvoiceValue)}</p>
            <p className="text-[11px] text-[rgb(var(--muted-foreground))] mt-1">Giá trị trung bình mỗi hóa đơn</p>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted-foreground))]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo Mã hóa đơn, Mã báo giá, Tên khách hàng, SĐT, Serial..."
            className={cn(
              'w-full pl-10 pr-4 py-2.5 rounded-xl text-sm',
              'bg-[rgb(var(--muted))] border border-[rgb(var(--border))]',
              'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50',
              'transition-smooth'
            )}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm bg-[rgb(var(--card))] border border-[rgb(var(--border))] focus:outline-none"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.values(InvoiceStatus).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
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
          <div className="overflow-x-auto">
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
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-[rgb(var(--border))]">
          <p className="text-xs text-[rgb(var(--muted-foreground))]">
            Trang {currentPage} / {totalPages} (Tổng {totalItems} hóa đơn)
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
