import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Truck,
  Plus,
  Search,
  Calendar,
  Building2,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Eye,
  CreditCard,
  X,
  Clock,
  Edit,
  Trash2,
} from 'lucide-react';
import api from '@/lib/api';
import { PaymentMethod } from '@/types';
import type { PurchaseRecord, PurchaseStats } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export function Purchases() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [stats, setStats] = useState<PurchaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(urlSearch);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal View Purchase Detail
  const [viewPurchaseDetail, setViewPurchaseDetail] = useState<PurchaseRecord | null>(null);

  // Modal Record Payment for Purchase
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.BANK_TRANSFER);
  const [bankName, setBankName] = useState<string>('MB Bank');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const handleDeleteDraft = async (pId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phiếu nhập lưu tạm này?')) return;
    try {
      await api.delete(`/purchases/${pId}`);
      toast.success('Đã xóa phiếu lưu tạm thành công');
      fetchPurchases();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể xóa phiếu nháp');
    }
  };

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const [listRes, statsRes] = await Promise.all([
        api.get('/purchases', { params: { search, status: statusFilter === 'all' ? undefined : statusFilter, limit: 100 } }),
        api.get('/purchases/stats'),
      ]);

      if (listRes.data.success) {
        setPurchases(listRes.data.data);
        const qSearch = searchParams.get('search');
        if (qSearch && listRes.data.data.length > 0) {
          const match = listRes.data.data.find(
            (p: PurchaseRecord) =>
              p.purchaseCode?.toLowerCase() === qSearch.toLowerCase() ||
              p._id === qSearch
          );
          if (match) {
            setViewPurchaseDetail(match);
          }
        }
      }
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể tải danh sách phiếu nhập');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [search, statusFilter]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPurchase) return;

    if (!paymentAmount || paymentAmount <= 0) {
      toast.error('Vui lòng nhập số tiền thanh toán hợp lệ');
      return;
    }

    try {
      setSubmittingPayment(true);
      const res = await api.post(`/purchases/${selectedPurchase._id}/payments`, {
        amount: paymentAmount,
        paymentMethod,
        bankName,
        note: paymentNote,
      });

      if (res.data.success) {
        toast.success(`Đã ghi nhận thanh toán ${formatCurrency(paymentAmount)} cho NCC`);
        setSelectedPurchase(null);
        fetchPurchases();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể ghi nhận thanh toán');
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[rgb(var(--foreground))]">
            Nhập Hàng (Phiếu Nhập)
          </h1>
          <p className="text-sm text-[rgb(var(--muted-foreground))] mt-1">
            Quản lý các đợt nhập hàng từ NCC, lưu Serial thiết bị và ghi nhận công nợ NCC
          </p>
        </div>

        <button
          onClick={() => navigate('/purchases/new')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Phiếu Nhập Hàng</span>
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-blue-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Tổng Giá Trị Nhập</span>
              <Truck className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-[rgb(var(--foreground))]">
              {formatCurrency(stats.totalPurchasesAmount)}
            </div>
            <p className="text-xs text-[rgb(var(--muted-foreground))]">Tổng tiền hàng mua từ NCC</p>
          </div>

          <div className="p-5 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-emerald-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Đã Trả NCC</span>
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-emerald-500">
              {formatCurrency(stats.totalPaidSuppliers)}
            </div>
            <p className="text-xs text-[rgb(var(--muted-foreground))]">Tổng tiền đã thanh toán</p>
          </div>

          <div className="p-5 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-amber-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Còn Nợ NCC</span>
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-amber-500">
              {formatCurrency(stats.totalRemainingDebt)}
            </div>
            <p className="text-xs text-[rgb(var(--muted-foreground))]">Công nợ nhập hàng hiện tại</p>
          </div>

          <div className="p-5 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-indigo-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Giá Trị Tồn Kho (Giá Nhập)</span>
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-indigo-500">
              {formatCurrency(stats.currentStockValuation)}
            </div>
            <p className="text-xs text-[rgb(var(--muted-foreground))]">Giá trị thực tế linh kiện còn trong kho</p>
          </div>
        </div>
      )}

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))]">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[rgb(var(--muted-foreground))]" />
          <input
            type="text"
            placeholder="Tìm theo Mã phiếu (PN2026...), Tên NCC, SĐT, Tên SP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] focus:outline-none focus:ring-2 focus:ring-blue-500 text-[rgb(var(--foreground))]"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1">
          {['all', 'DRAFT', 'UNPAID', 'PARTIALLY_PAID', 'PAID'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-blue-500/10 text-blue-500 border-blue-500/30 font-semibold'
                  : 'bg-[rgb(var(--background))] text-[rgb(var(--muted-foreground))] border-[rgb(var(--border))]'
              }`}
            >
              {st === 'all'
                ? 'Tất cả'
                : st === 'DRAFT'
                ? '📝 Lưu tạm (Nháp)'
                : st === 'PAID'
                ? 'Đã trả đủ'
                : st === 'PARTIALLY_PAID'
                ? 'Trả 1 phần'
                : 'Chưa trả'}
            </button>
          ))}
        </div>
      </div>

      {/* Purchases List */}
      <div className="rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-sm text-[rgb(var(--muted-foreground))]">
            Đang tải danh sách phiếu nhập hàng...
          </div>
        ) : purchases.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Truck className="w-12 h-12 text-[rgb(var(--muted-foreground))] mx-auto stroke-1" />
            <div className="text-base font-semibold text-[rgb(var(--foreground))]">
              Chưa có phiếu nhập hàng nào
            </div>
            <p className="text-xs text-[rgb(var(--muted-foreground))] max-w-sm mx-auto">
              Bấm nút "Tạo Phiếu Nhập Hàng" để chọn Nhà cung cấp và nhập hàng loạt Serial linh kiện vào kho.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[rgb(var(--muted))/50] text-[rgb(var(--muted-foreground))] text-xs font-semibold uppercase border-b border-[rgb(var(--border))]">
                <tr>
                  <th className="px-5 py-3.5">Mã Phiếu</th>
                  <th className="px-5 py-3.5">Nhà Cung Cấp</th>
                  <th className="px-5 py-3.5">Ngày Nhập</th>
                  <th className="px-5 py-3.5">Sản Phẩm Nhập</th>
                  <th className="px-5 py-3.5 text-right">Tổng Tiền</th>
                  <th className="px-5 py-3.5 text-right">Đã Trả</th>
                  <th className="px-5 py-3.5 text-right">Còn Nợ</th>
                  <th className="px-5 py-3.5 text-center">Hạn Trả Nợ (Đến Hạn)</th>
                  <th className="px-5 py-3.5 text-center">Trạng Thái</th>
                  <th className="px-5 py-3.5 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--border))]">
                {purchases.map((p) => {
                  const daysDiff = p.dueDate ? Math.ceil((new Date(p.dueDate).getTime() - Date.now()) / (1000 * 3600 * 24)) : null;
                  const isOverdue = daysDiff !== null && daysDiff < 0;

                  return (
                    <tr
                      key={p._id}
                      onClick={() => setViewPurchaseDetail(p)}
                      className="hover:bg-[rgb(var(--accent))/40] cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-4 font-mono font-bold text-xs text-blue-500 hover:underline">
                        {p.purchaseCode}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-[rgb(var(--foreground))]">{p.supplier?.name}</div>
                        {p.supplier?.phone && (
                          <div className="text-xs text-[rgb(var(--muted-foreground))]">{p.supplier.phone}</div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-[rgb(var(--foreground))]">
                        {formatDate(p.purchaseDate)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs font-medium text-[rgb(var(--foreground))] max-w-xs truncate">
                          {p.items?.map((it) => `${it.productName} (${it.quantity})`).join(', ')}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-[rgb(var(--foreground))]">
                        {formatCurrency(p.totalAmount)}
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-emerald-500">
                        {formatCurrency(p.paidAmount)}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold">
                        {p.remainingAmount > 0 ? (
                          <span className="text-amber-500 font-bold">{formatCurrency(p.remainingAmount)}</span>
                        ) : (
                          <span className="text-xs text-[rgb(var(--muted-foreground))]">0 ₫</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {p.remainingAmount > 0 ? (
                          p.dueDate ? (
                            <span
                              className={`text-xs px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1 ${
                                isOverdue
                                  ? 'bg-red-500/10 text-red-500 border border-red-500/30'
                                  : 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                              }`}
                            >
                              {isOverdue
                                ? `🚨 Quá hạn ${Math.abs(daysDiff)} ngày (${formatDate(p.dueDate)})`
                                : `⏳ Hạn: ${formatDate(p.dueDate)} (Còn ${daysDiff}d)`}
                            </span>
                          ) : (
                            <span className="text-xs text-[rgb(var(--muted-foreground))]">Chưa đặt hạn</span>
                          )
                        ) : (
                          <span className="text-xs text-emerald-500 font-medium">✓ Đã trả đủ</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                            p.isDraft || p.status === 'DRAFT'
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30 font-bold'
                              : p.status === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : p.status === 'PARTIALLY_PAID'
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-red-500/10 text-red-500'
                          }`}
                        >
                          {p.isDraft || p.status === 'DRAFT'
                            ? '📝 Lưu tạm (Nháp)'
                            : p.status === 'PAID'
                            ? 'Đã trả đủ'
                            : p.status === 'PARTIALLY_PAID'
                            ? 'Trả 1 phần'
                            : 'Chưa trả'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {p.isDraft || p.status === 'DRAFT' ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/purchases/edit/${p._id}`);
                                }}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 border border-indigo-500/30 flex items-center gap-1 transition-colors"
                                title="Chỉnh sửa và Duyệt phiếu nháp"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Sửa / Duyệt</span>
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDraft(p._id);
                                }}
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                                title="Xóa phiếu lưu tạm"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewPurchaseDetail(p);
                                }}
                                className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-500/10 transition-colors"
                                title="Xem chi tiết phiếu nhập"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/purchases/edit/${p._id}`);
                                }}
                                className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-500/10 transition-colors"
                                title="Chỉnh sửa phiếu nhập"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {p.remainingAmount > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPurchase(p);
                                    setPaymentAmount(p.remainingAmount);
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                                >
                                  Trả NCC
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Pay Supplier */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[rgb(var(--border))] bg-[rgb(var(--muted))/30]">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-base text-[rgb(var(--foreground))]">
                  Thanh Toán Cho Nhà Cung Cấp
                </h3>
              </div>
              <button
                onClick={() => setSelectedPurchase(null)}
                className="p-1 rounded-lg text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--accent))]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPayment} className="p-6 space-y-4">
              <div className="p-4 rounded-xl bg-[rgb(var(--muted))/30] space-y-1">
                <div className="text-xs text-[rgb(var(--muted-foreground))]">Phiếu nhập:</div>
                <div className="font-mono font-bold text-blue-500">{selectedPurchase.purchaseCode}</div>
                <div className="text-xs text-[rgb(var(--foreground))]">
                  NCC: {selectedPurchase.supplier?.name}
                </div>
                <div className="text-xs text-amber-500 font-semibold pt-1">
                  Số tiền còn nợ: {formatCurrency(selectedPurchase.remainingAmount)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                  Số Tiền Thanh Toán (₫) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1000}
                  max={selectedPurchase.remainingAmount}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                  Hình Thức Thanh Toán
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
                >
                  <option value={PaymentMethod.BANK_TRANSFER}>Chuyển Khoản Ngân Hàng</option>
                  <option value={PaymentMethod.CASH}>Tiền Mặt</option>
                  <option value={PaymentMethod.OTHER}>Khác</option>
                </select>
              </div>

              {paymentMethod === PaymentMethod.BANK_TRANSFER && (
                <div>
                  <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                    Tên Ngân Hàng
                  </label>
                  <input
                    type="text"
                    placeholder="MB Bank, Vietcombank..."
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                  Ghi Chú
                </label>
                <input
                  type="text"
                  placeholder="VD: Chuyển khoản đợt 2..."
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgb(var(--border))]">
                <button
                  type="button"
                  onClick={() => setSelectedPurchase(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--accent))]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {submittingPayment ? 'Đang lưu...' : 'Xác Nhận Thanh Toán'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal View Purchase Ticket Details & Debt Breakdown */}
      {viewPurchaseDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[rgb(var(--border))] bg-[rgb(var(--muted))/30]">
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-blue-500" />
                <div>
                  <h3 className="font-bold text-base text-[rgb(var(--foreground))]">
                    Chi Tiết Phiếu Nhập Hàng: {viewPurchaseDetail.purchaseCode}
                  </h3>
                  <div className="text-xs text-[rgb(var(--muted-foreground))]">
                    NCC: <strong>{viewPurchaseDetail.supplier?.name}</strong> • Ngày nhập: {formatDate(viewPurchaseDetail.purchaseDate)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const pId = viewPurchaseDetail._id;
                    setViewPurchaseDetail(null);
                    navigate(`/purchases/edit/${pId}`);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 border border-indigo-500/30 flex items-center gap-1.5 transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Sửa Phiếu Nhập</span>
                </button>
                <button
                  onClick={() => setViewPurchaseDetail(null)}
                  className="p-1.5 rounded-lg text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--accent))]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Financial Debt Summary Cards for this ticket */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-[rgb(var(--muted))/30] border border-[rgb(var(--border))]">
                <div>
                  <div className="text-xs text-[rgb(var(--muted-foreground))]">Tổng Giá Trị Phiếu</div>
                  <div className="text-base font-bold text-[rgb(var(--foreground))]">
                    {formatCurrency(viewPurchaseDetail.totalAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-emerald-500 font-semibold">Đã Thanh Toán</div>
                  <div className="text-base font-bold text-emerald-500">
                    {formatCurrency(viewPurchaseDetail.paidAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-amber-500 font-semibold">Còn Nợ Phiếu Này</div>
                  <div className="text-base font-bold text-amber-500">
                    {formatCurrency(viewPurchaseDetail.remainingAmount)}
                  </div>
                  {viewPurchaseDetail.dueDate && (
                    <div className="text-[11px] font-semibold text-amber-600">
                      Hạn trả: {formatDate(viewPurchaseDetail.dueDate)}
                    </div>
                  )}
                </div>
              </div>

              {/* Imported Items & Serials */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
                  Danh Sách Sản Phẩm & Serial Nhập Vào Kho ({viewPurchaseDetail.items?.length || 0})
                </h4>
                <div className="rounded-xl border border-[rgb(var(--border))] overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[rgb(var(--muted))/50] border-b border-[rgb(var(--border))] font-semibold text-[rgb(var(--muted-foreground))]">
                      <tr>
                        <th className="px-4 py-2.5">Sản Phẩm</th>
                        <th className="px-4 py-2.5 text-center">SL</th>
                        <th className="px-4 py-2.5 text-right">Giá Nhập</th>
                        <th className="px-4 py-2.5 text-right">Thành Tiền</th>
                        <th className="px-4 py-2.5">Danh Sách Serial Number</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgb(var(--border))]">
                      {viewPurchaseDetail.items?.map((it, idx) => (
                        <tr key={idx} className="hover:bg-[rgb(var(--accent))/30]">
                          <td className="px-4 py-3">
                            <div className="font-bold text-[rgb(var(--foreground))]">{it.productName}</div>
                            <div className="font-mono text-[10px] text-blue-500">{it.productCode}</div>
                          </td>
                          <td className="px-4 py-3 text-center font-bold">{it.quantity}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatCurrency(it.costPrice)}</td>
                          <td className="px-4 py-3 text-right font-bold text-[rgb(var(--foreground))]">
                            {formatCurrency(it.total)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {it.serials?.map((s) => (
                                <span
                                  key={s}
                                  className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-semibold border border-blue-500/20"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment History for this ticket */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[rgb(var(--muted-foreground))] flex items-center justify-between">
                  <span>Lịch Sử Các Đợt Thanh Toán Cho NCC ({viewPurchaseDetail.payments?.length || 0})</span>
                  {viewPurchaseDetail.remainingAmount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPurchase(viewPurchaseDetail);
                        setPaymentAmount(viewPurchaseDetail.remainingAmount);
                        setViewPurchaseDetail(null);
                      }}
                      className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500 text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600"
                    >
                      + Trả Nợ Phiếu Này ({formatCurrency(viewPurchaseDetail.remainingAmount)})
                    </button>
                  )}
                </h4>

                {!viewPurchaseDetail.payments || viewPurchaseDetail.payments.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[rgb(var(--muted-foreground))] bg-[rgb(var(--muted))/20] rounded-xl">
                    Chưa có lượt thanh toán nào cho phiếu nhập này
                  </div>
                ) : (
                  <div className="rounded-xl border border-[rgb(var(--border))] overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[rgb(var(--muted))/50] border-b border-[rgb(var(--border))] font-semibold text-[rgb(var(--muted-foreground))]">
                        <tr>
                          <th className="px-4 py-2.5">Mã GD</th>
                          <th className="px-4 py-2.5">Ngày Thanh Toán</th>
                          <th className="px-4 py-2.5">Hình Thức</th>
                          <th className="px-4 py-2.5 text-right">Số Tiền</th>
                          <th className="px-4 py-2.5">Ghi Chú</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[rgb(var(--border))]">
                        {viewPurchaseDetail.payments.map((pm, pidx) => (
                          <tr key={pidx} className="hover:bg-[rgb(var(--accent))/30]">
                            <td className="px-4 py-3 font-mono font-bold text-blue-500">{pm.paymentCode}</td>
                            <td className="px-4 py-3">{formatDate(pm.paymentDate)}</td>
                            <td className="px-4 py-3 font-medium">
                              {pm.paymentMethod} {pm.bankName ? `(${pm.bankName})` : ''}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-500">
                              {formatCurrency(pm.amount)}
                            </td>
                            <td className="px-4 py-3 text-[rgb(var(--muted-foreground))]">{pm.note || '---'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-[rgb(var(--border))] bg-[rgb(var(--muted))/20] flex items-center justify-end">
              <button
                type="button"
                onClick={() => setViewPurchaseDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[rgb(var(--accent))] text-[rgb(var(--foreground))]"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
