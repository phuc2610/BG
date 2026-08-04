import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn, formatCurrency, formatDate, debtBadgeColors } from '@/lib/utils';
import type { DebtRecord, DebtStats } from '@/types';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Scale, Search, CreditCard, AlertCircle, ShieldAlert, CheckCircle2,
  ChevronLeft, ChevronRight, Eye, Calendar, DollarSign, Clock, Users, ArrowRight, X, Save, Loader2,
} from 'lucide-react';
import { PaymentMethod } from '@/types';

export function Debts() {
  const navigate = useNavigate();
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [stats, setStats] = useState<DebtStats | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('has_debt');
  const [payingDebt, setPayingDebt] = useState<DebtRecord | null>(null);

  const fetchDebts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: currentPage,
        limit: 15,
        debtStatus: statusFilter,
      };
      if (search.trim()) params.search = search.trim();

      const [res, statsRes] = await Promise.all([
        api.get('/debts', { params }),
        api.get('/debts/stats'),
      ]);

      setDebts(res.data.data);
      setTotalItems(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
      setStats(statsRes.data.data);
    } catch {
      toast.error('Không thể tải danh sách công nợ');
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, statusFilter]);

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quản Lý Công Nợ Phải Thu</h1>
          <p className="text-sm text-[rgb(var(--muted-foreground))] mt-1">
            Tự động theo dõi công nợ bán hàng, đôn đốc nợ quá hạn và ghi nhận thanh toán nhiều đợt
          </p>
        </div>
      </div>

      {/* Debt Summary Dashboard */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[rgb(var(--muted-foreground))] uppercase">Tổng Công Nợ</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Scale className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-[rgb(var(--foreground))] mt-2">{formatCurrency(stats.totalDebt)}</p>
            <p className="text-[11px] text-[rgb(var(--muted-foreground))] mt-1">Tổng giá trị đơn có nợ</p>
          </div>

          <div className="p-4 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[rgb(var(--muted-foreground))] uppercase">Đã Thu Về Quỹ</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-emerald-500 mt-2">{formatCurrency(stats.totalCollected)}</p>
            <p className="text-[11px] text-[rgb(var(--muted-foreground))] mt-1">Số tiền đã thực thu</p>
          </div>

          <div className="p-4 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[rgb(var(--muted-foreground))] uppercase">Chưa Thu (Còn Nợ)</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-amber-500 mt-2">{formatCurrency(stats.totalOutstanding)}</p>
            <p className="text-[11px] text-[rgb(var(--muted-foreground))] mt-1">Khoản phải thu tồn dư</p>
          </div>

          <div className="p-4 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[rgb(var(--muted-foreground))] uppercase">Nợ Quá Hạn</span>
              <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-red-500 mt-2">{formatCurrency(stats.totalOverdue)}</p>
            <p className="text-[11px] text-[rgb(var(--muted-foreground))] mt-1">Cần ưu tiên thu hồi</p>
          </div>

          <div className="p-4 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[rgb(var(--muted-foreground))] uppercase">Nợ Nhiều Nhất</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-sm font-bold text-[rgb(var(--foreground))] mt-2 truncate">
              {stats.topDebtor ? stats.topDebtor.name : 'Không có'}
            </p>
            <p className="text-xs font-extrabold text-amber-500 mt-0.5">
              {stats.topDebtor ? formatCurrency(stats.topDebtor.amount) : '0 đ'}
            </p>
          </div>
        </div>
      )}

      {/* Filters Bar & Tabs */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted-foreground))]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo Tên khách, Mã KH, SĐT, Tên công ty, Mã đơn..."
            className={cn(
              'w-full pl-10 pr-4 py-2.5 rounded-xl text-sm',
              'bg-[rgb(var(--muted))] border border-[rgb(var(--border))]',
              'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50',
              'transition-smooth'
            )}
          />
        </div>

        <div className="flex items-center gap-1 bg-[rgb(var(--card))] p-1 rounded-xl border border-[rgb(var(--border))] overflow-x-auto">
          {[
            { key: 'has_debt', label: 'CÒN NỢ' },
            { key: 'overdue', label: 'QUÁ HẠN 🔴' },
            { key: 'due_soon', label: 'SẮP ĐẾN HẠN 🟡' },
            { key: 'paid', label: 'HOÀN THÀNH 🟢' },
            { key: 'all', label: 'Tất cả' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-smooth whitespace-nowrap',
                statusFilter === tab.key
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Debts DataTable */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
              <div className="skeleton w-1/3 h-5 mb-2" />
              <div className="skeleton w-1/4 h-4" />
            </div>
          ))}
        </div>
      ) : debts.length === 0 ? (
        <div className="text-center py-20 text-[rgb(var(--muted-foreground))]">
          <Scale className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Không có khoản công nợ nào phù hợp lọc</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[rgb(var(--muted))]/50 border-b border-[rgb(var(--border))] text-[11px] font-semibold text-[rgb(var(--muted-foreground))] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Mã Đơn / Ngày Lập</th>
                  <th className="px-4 py-3">Khách Hàng / Công Ty</th>
                  <th className="px-4 py-3 text-right">Tổng Tiền</th>
                  <th className="px-4 py-3 text-right">Đã Thanh Toán</th>
                  <th className="px-4 py-3 text-right">Còn Nợ</th>
                  <th className="px-4 py-3 text-center">Hạn Thanh Toán</th>
                  <th className="px-4 py-3 text-center">Trạng Thái</th>
                  <th className="px-4 py-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--border))]">
                {debts.map((d) => {
                  const badgeInfo = debtBadgeColors[d.debtStatus] || debtBadgeColors.UNPAID;
                  const isDebt = d.remainingAmount > 0;
                  return (
                    <tr
                      key={d._id}
                      onClick={() => navigate(`/invoices/${d.invoiceId}`)}
                      className="hover:bg-[rgb(var(--accent))] transition-smooth cursor-pointer"
                    >
                      <td className="px-4 py-3.5 font-bold font-mono text-blue-500">
                        {d.invoiceCode}
                        <span className="block text-[10px] text-[rgb(var(--muted-foreground))] font-normal">
                          {formatDate(d.createdDate)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-sm text-[rgb(var(--foreground))]">{d.customer.name}</p>
                        <p className="text-xs text-[rgb(var(--muted-foreground))]">{d.customer.phone || '---'}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold">
                        {formatCurrency(d.grandTotal)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-emerald-500">
                        {formatCurrency(d.totalPaid)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold">
                        <span className={isDebt ? 'text-amber-500' : 'text-[rgb(var(--muted-foreground))]'}>
                          {formatCurrency(d.remainingAmount)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center text-xs">
                        <p className="font-semibold text-[rgb(var(--foreground))]">{formatDate(d.dueDate)}</p>
                        {d.overdueDays > 0 ? (
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                            🔴 Quá {d.overdueDays} ngày
                          </span>
                        ) : d.debtStatus === 'PAID' ? (
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-500">
                            🟢 Đã hoàn thành
                          </span>
                        ) : d.remainingDays <= 3 ? (
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            🟡 Còn {d.remainingDays} ngày
                          </span>
                        ) : (
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-500">
                            🟢 Còn {d.remainingDays} ngày
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={cn('px-2.5 py-1 rounded-lg text-xs font-bold border', badgeInfo.className)}>
                          {badgeInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {isDebt && (
                            <button
                              onClick={() => setPayingDebt(d)}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold hover:opacity-90 transition-smooth shadow-md shadow-emerald-500/20"
                            >
                              Thu Nợ
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/invoices/${d.invoiceId}`)}
                            className="p-1.5 rounded-lg hover:bg-[rgb(var(--accent))] text-blue-500"
                            title="Xem hóa đơn chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
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
            Trang {currentPage} / {totalPages} (Tổng {totalItems} khoản nợ)
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

      {/* Debt Payment Modal */}
      {payingDebt && (
        <DebtPaymentModal
          debt={payingDebt}
          onClose={() => setPayingDebt(null)}
          onSuccess={() => {
            setPayingDebt(null);
            fetchDebts();
          }}
        />
      )}
    </div>
  );
}

// Modal Thu Nợ Công Nợ
function DebtPaymentModal({
  debt,
  onClose,
  onSuccess,
}: {
  debt: DebtRecord;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState(debt.remainingAmount);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.BANK_TRANSFER);
  const [bankName, setBankName] = useState('MB Bank');
  const [referenceCode, setReferenceCode] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      toast.error('Số tiền thu không hợp lệ');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/debts/${debt.invoiceId}/payments`, {
        amount: Number(amount),
        paymentMethod,
        bankName: paymentMethod === PaymentMethod.BANK_TRANSFER ? bankName : undefined,
        referenceCode: referenceCode.trim() || undefined,
        notes: notes.trim() || undefined,
        createdBy: 'Admin',
      });
      toast.success('Đã thu nợ thành công!');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể ghi nhận thu nợ');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = cn(
    'w-full px-4 py-2.5 rounded-xl text-sm',
    'bg-[rgb(var(--muted))] border border-[rgb(var(--border))]',
    'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50',
    'transition-smooth'
  );

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className={cn(
        'fixed inset-x-4 top-[15%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[500px]',
        'rounded-2xl border shadow-2xl z-50 overflow-hidden flex flex-col',
        'bg-[rgb(var(--card))] border-[rgb(var(--border))]',
        'animate-scale-in'
      )}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgb(var(--border))]">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-500" />
            <h2 className="text-base font-bold">Thu Nợ Công Nợ: {debt.invoiceCode}</h2>
          </div>
          <button type="button" onClick={onClose}>
            <X className="w-5 h-5 text-[rgb(var(--muted-foreground))]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 flex justify-between items-center">
            <div>
              <p className="font-bold">{debt.customer.name}</p>
              <p className="text-[11px] text-[rgb(var(--muted-foreground))]">Đơn hàng: {debt.invoiceCode}</p>
            </div>
            <strong className="text-base font-extrabold text-amber-500">{formatCurrency(debt.remainingAmount)}</strong>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Số tiền thu đợt này (VNĐ) *</label>
            <input
              type="number"
              min={1000}
              max={debt.remainingAmount}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className={cn(inputClass, 'text-base font-bold text-emerald-500')}
              placeholder="VD: 5000000"
            />
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setAmount(debt.remainingAmount)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
              >
                Thu hết ({formatCurrency(debt.remainingAmount)})
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Phương thức thanh toán *</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className={inputClass}
            >
              {Object.values(PaymentMethod).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {paymentMethod === PaymentMethod.BANK_TRANSFER && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tên Ngân hàng</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className={inputClass}
                placeholder="VD: MB Bank, Vietcombank..."
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-1.5 block">Mã giao dịch / Mã tham chiếu</label>
            <input
              type="text"
              value={referenceCode}
              onChange={(e) => setReferenceCode(e.target.value)}
              className={inputClass}
              placeholder="VD: FT2620984012"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Ghi chú lượt thu nợ</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass}
              placeholder="VD: Khách thu nợ đợt 2..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgb(var(--border))]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[rgb(var(--accent))] transition-smooth"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold hover:opacity-90 transition-smooth disabled:opacity-50 shadow-lg shadow-emerald-500/25"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Xác Nhận Thu Nợ
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
