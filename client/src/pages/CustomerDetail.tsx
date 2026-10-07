import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { cn, formatCurrency, formatDate, customerTypeColors, getInitialsAvatarUrl, quoteStatusColors, invoiceStatusColors } from '@/lib/utils';
import type { CustomerRecord, Quote, Invoice, CustomerActivity } from '@/types';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Users, Phone, Mail, MapPin, Building2, Calendar, DollarSign,
  FileText, Receipt, CreditCard, Scale, Clock, MessageSquare, Plus, ExternalLink,
  Loader2, CheckCircle2, AlertCircle, Edit, Tag, UserCheck, ShieldAlert,
} from 'lucide-react';

type TabKey = 'info' | 'quotes' | 'invoices' | 'payments' | 'debts' | 'timeline' | 'notes';

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const [data, setData] = useState<{
    customer: CustomerRecord;
    quotes: Quote[];
    invoices: Invoice[];
    payments: any[];
    activities: CustomerActivity[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get(`/customers/${id}/profile`);
      setData(res.data.data);
    } catch {
      toast.error('Không thể tải hồ sơ khách hàng');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !data) return;
    setAddingNote(true);
    try {
      const updatedNotes = data.customer.notes
        ? `${data.customer.notes}\n[${formatDate(new Date())}] ${newNote.trim()}`
        : `[${formatDate(new Date())}] ${newNote.trim()}`;

      await api.put(`/customers/${data.customer._id}`, { notes: updatedNotes });
      toast.success('Đã lưu ghi chú mới!');
      setNewNote('');
      fetchProfile();
    } catch {
      toast.error('Không thể lưu ghi chú');
    } finally {
      setAddingNote(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const { customer, quotes, invoices, payments, activities } = data;
  const avatar = customer.avatarUrl || getInitialsAvatarUrl(customer.name);
  const activeDebts = invoices.filter(inv => inv.remainingAmount > 0);

  const tabs: { key: TabKey; label: string; icon: any; count?: number }[] = [
    { key: 'info', label: 'Thông Tin', icon: Users },
    { key: 'quotes', label: 'Báo Giá', icon: FileText, count: quotes.length },
    { key: 'invoices', label: 'Đơn Hàng / Hóa Đơn', icon: Receipt, count: invoices.length },
    { key: 'payments', label: 'Thanh Toán', icon: CreditCard, count: payments.length },
    { key: 'debts', label: 'Công Nợ', icon: Scale, count: activeDebts.length },
    { key: 'timeline', label: 'Lịch Sử Hoạt Động', icon: Clock, count: activities.length },
    { key: 'notes', label: 'Ghi Chú', icon: MessageSquare },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in pb-12">
      {/* Back button */}
      <button
        onClick={() => navigate('/customers')}
        className="flex items-center gap-2 text-sm text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] font-medium transition-smooth"
      >
        <ArrowLeft className="w-4 h-4" />
        Quay lại Danh sách Khách Hàng CRM
      </button>

      {/* HubSpot/Stripe Style Profile Header */}
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4 border-b border-[rgb(var(--border))] pb-6">
          <div className="flex items-center gap-4 min-w-0">
            <img
              src={avatar}
              alt=""
              className="w-16 h-16 rounded-full object-cover border-2 border-blue-500/30 shadow-md flex-shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-[rgb(var(--foreground))]">{customer.name}</h1>
                <span className={cn('px-3 py-1 rounded-xl text-xs font-bold border', customerTypeColors[customer.customerType])}>
                  {customer.customerType}
                </span>
                <span className="font-mono text-xs font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">
                  {customer.customerCode}
                </span>
              </div>

              {customer.companyName && (
                <p className="text-sm font-semibold text-[rgb(var(--muted-foreground))] mt-1 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  {customer.companyName} {customer.taxCode ? `(MST: ${customer.taxCode})` : ''}
                </p>
              )}

              <div className="flex items-center gap-4 text-xs text-[rgb(var(--muted-foreground))] mt-2 flex-wrap">
                {customer.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-blue-500" /> {customer.phone}</span>}
                {customer.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-blue-500" /> {customer.email}</span>}
                {customer.address && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-blue-500" /> {customer.address}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/quotes/new`)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-500/10 text-blue-500 text-xs font-semibold hover:bg-blue-500/20 transition-smooth border border-blue-500/20"
            >
              <FileText className="w-4 h-4" />
              Lập Báo Giá
            </button>
          </div>
        </div>

        {/* Customer Lifecycle Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-xl bg-[rgb(var(--muted))]/40 border border-[rgb(var(--border))]">
            <span className="text-[10px] font-bold text-[rgb(var(--muted-foreground))] uppercase">Tổng Đơn Hàng</span>
            <p className="text-lg font-bold mt-1 text-[rgb(var(--foreground))]">{customer.totalOrders || 0}</p>
          </div>
          <div className="p-3 rounded-xl bg-[rgb(var(--muted))]/40 border border-[rgb(var(--border))]">
            <span className="text-[10px] font-bold text-[rgb(var(--muted-foreground))] uppercase">Tổng Doanh Thu</span>
            <p className="text-lg font-bold mt-1 text-blue-500">{formatCurrency(customer.totalRevenue || 0)}</p>
          </div>
          <div className="p-3 rounded-xl bg-[rgb(var(--muted))]/40 border border-[rgb(var(--border))]">
            <span className="text-[10px] font-bold text-[rgb(var(--muted-foreground))] uppercase">Đã Thanh Toán</span>
            <p className="text-lg font-bold mt-1 text-emerald-500">{formatCurrency(customer.totalPaid || 0)}</p>
          </div>
          <div className="p-3 rounded-xl bg-[rgb(var(--muted))]/40 border border-[rgb(var(--border))]">
            <span className="text-[10px] font-bold text-[rgb(var(--muted-foreground))] uppercase">Công Nợ Nợ</span>
            <p className="text-lg font-bold mt-1 text-amber-500">{formatCurrency(customer.totalDebt || 0)}</p>
          </div>
          <div className="p-3 rounded-xl bg-[rgb(var(--muted))]/40 border border-[rgb(var(--border))]">
            <span className="text-[10px] font-bold text-[rgb(var(--muted-foreground))] uppercase">Lần Mua Đầu</span>
            <p className="text-xs font-semibold mt-1 text-[rgb(var(--foreground))]">
              {customer.firstPurchaseDate ? formatDate(customer.firstPurchaseDate) : '---'}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-[rgb(var(--muted))]/40 border border-[rgb(var(--border))]">
            <span className="text-[10px] font-bold text-[rgb(var(--muted-foreground))] uppercase">Lần Mua Gần Nhất</span>
            <p className="text-xs font-semibold mt-1 text-[rgb(var(--foreground))]">
              {customer.lastPurchaseDate ? formatDate(customer.lastPurchaseDate) : '---'}
            </p>
          </div>
        </div>
      </div>

      {/* 7 CRM Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-[rgb(var(--border))] overflow-x-auto no-scrollbar">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-smooth whitespace-nowrap',
                isActive
                  ? 'border-blue-500 text-blue-500 bg-blue-500/5'
                  : 'border-transparent text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] hover:border-[rgb(var(--border))]'
              )}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              {t.count !== undefined && (
                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-mono', isActive ? 'bg-blue-500 text-white' : 'bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))]')}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Display */}
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm min-h-[400px]">
        {/* TAB 1: THÔNG TIN CHI TIẾT */}
        {activeTab === 'info' && (
          <div className="space-y-6">
            <h3 className="text-base font-bold">Hồ sơ Thông Tin Chi Tiết Khách Hàng CRM</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-[rgb(var(--border))]">
                  <span className="text-[rgb(var(--muted-foreground))]">Mã Khách Hàng:</span>
                  <span className="font-bold font-mono text-blue-500">{customer.customerCode}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[rgb(var(--border))]">
                  <span className="text-[rgb(var(--muted-foreground))]">Họ và Tên:</span>
                  <span className="font-bold">{customer.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[rgb(var(--border))]">
                  <span className="text-[rgb(var(--muted-foreground))]">Số điện thoại chính:</span>
                  <span className="font-semibold">{customer.phone || '---'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[rgb(var(--border))]">
                  <span className="text-[rgb(var(--muted-foreground))]">Số điện thoại phụ:</span>
                  <span>{customer.secondaryPhone || '---'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[rgb(var(--border))]">
                  <span className="text-[rgb(var(--muted-foreground))]">Email:</span>
                  <span>{customer.email || '---'}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-[rgb(var(--border))]">
                  <span className="text-[rgb(var(--muted-foreground))]">Tên Công Ty:</span>
                  <span className="font-semibold">{customer.companyName || '---'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[rgb(var(--border))]">
                  <span className="text-[rgb(var(--muted-foreground))]">Người liên hệ:</span>
                  <span>{customer.contactPerson || '---'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[rgb(var(--border))]">
                  <span className="text-[rgb(var(--muted-foreground))]">Mã Số Thuế:</span>
                  <span className="font-mono">{customer.taxCode || '---'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[rgb(var(--border))]">
                  <span className="text-[rgb(var(--muted-foreground))]">Facebook / Zalo:</span>
                  <span>{customer.facebook || customer.zalo || '---'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[rgb(var(--border))]">
                  <span className="text-[rgb(var(--muted-foreground))]">Địa chỉ:</span>
                  <span className="text-right font-medium">{customer.address || '---'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BÁO GIÁ */}
        {activeTab === 'quotes' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold">Danh sách Báo Giá ({quotes.length})</h3>
            {quotes.length === 0 ? (
              <p className="text-sm text-[rgb(var(--muted-foreground))] text-center py-12">Khách hàng chưa có báo giá nào</p>
            ) : (
              <>
              <div className="md:hidden space-y-2">
                {quotes.map((q) => (
                  <div
                    key={q._id}
                    onClick={() => navigate(`/quotes/${q._id}`)}
                    className="p-3.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))]/20 active:bg-[rgb(var(--accent))] cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono font-bold text-blue-500 text-sm">{q.quoteCode}</p>
                        <p className="text-xs text-[rgb(var(--muted-foreground))]">{formatDate(q.createdDate)} • {q.items.length} SP</p>
                      </div>
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-semibold border flex-shrink-0', quoteStatusColors[q.status])}>
                        {q.status}
                      </span>
                    </div>
                    <p className="font-bold text-sm text-right mt-2">{formatCurrency(q.grandTotal)}</p>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[rgb(var(--muted))]/50 border-b border-[rgb(var(--border))] text-[11px] font-semibold text-[rgb(var(--muted-foreground))] uppercase">
                    <tr>
                      <th className="px-4 py-2.5">Mã Báo Giá</th>
                      <th className="px-4 py-2.5">Ngày Lập</th>
                      <th className="px-4 py-2.5 text-center">Số SP</th>
                      <th className="px-4 py-2.5 text-right">Tổng Tiền</th>
                      <th className="px-4 py-2.5 text-center">Trạng Thái</th>
                      <th className="px-4 py-2.5 text-right">Xem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgb(var(--border))]">
                    {quotes.map((q) => (
                      <tr key={q._id} className="hover:bg-[rgb(var(--accent))]">
                        <td className="px-4 py-3 font-mono font-bold text-blue-500">{q.quoteCode}</td>
                        <td className="px-4 py-3 text-xs text-[rgb(var(--muted-foreground))]">{formatDate(q.createdDate)}</td>
                        <td className="px-4 py-3 text-center font-semibold">{q.items.length}</td>
                        <td className="px-4 py-3 text-right font-bold">{formatCurrency(q.grandTotal)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn('px-2 py-0.5 rounded text-xs font-semibold border', quoteStatusColors[q.status])}>
                            {q.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => navigate(`/quotes/${q._id}`)} className="p-1 text-blue-500 hover:bg-blue-500/10 rounded">
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        )}

        {/* TAB 3: ĐƠN HÀNG / HÓA ĐƠN */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold">Danh sách Đơn Hàng / Hóa Đơn ({invoices.length})</h3>
            {invoices.length === 0 ? (
              <p className="text-sm text-[rgb(var(--muted-foreground))] text-center py-12">Khách hàng chưa có hóa đơn bán hàng nào</p>
            ) : (
              <>
              <div className="md:hidden space-y-2">
                {invoices.map((inv) => (
                  <div
                    key={inv._id}
                    onClick={() => navigate(`/invoices/${inv._id}`)}
                    className="p-3.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))]/20 active:bg-[rgb(var(--accent))] cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono font-bold text-blue-500 text-sm">{inv.invoiceCode}</p>
                        <p className="text-xs text-[rgb(var(--muted-foreground))]">{formatDate(inv.createdDate)}</p>
                      </div>
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-semibold border flex-shrink-0', invoiceStatusColors[inv.status])}>
                        {inv.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                      <div>
                        <p className="text-[10px] text-[rgb(var(--muted-foreground))] uppercase">Tổng</p>
                        <p className="font-bold">{formatCurrency(inv.grandTotal)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[rgb(var(--muted-foreground))] uppercase">Đã Trả</p>
                        <p className="font-bold text-emerald-500">{formatCurrency(inv.totalPaid)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[rgb(var(--muted-foreground))] uppercase">Còn Nợ</p>
                        <p className="font-bold text-amber-500">{formatCurrency(inv.remainingAmount)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[rgb(var(--muted))]/50 border-b border-[rgb(var(--border))] text-[11px] font-semibold text-[rgb(var(--muted-foreground))] uppercase">
                    <tr>
                      <th className="px-4 py-2.5">Mã Hóa Đơn</th>
                      <th className="px-4 py-2.5">Ngày Lập</th>
                      <th className="px-4 py-2.5 text-right">Tổng Tiền</th>
                      <th className="px-4 py-2.5 text-right">Đã Thanh Toán</th>
                      <th className="px-4 py-2.5 text-right">Còn Nợ</th>
                      <th className="px-4 py-2.5 text-center">Trạng Thái</th>
                      <th className="px-4 py-2.5 text-right">Xem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgb(var(--border))]">
                    {invoices.map((inv) => (
                      <tr key={inv._id} className="hover:bg-[rgb(var(--accent))]">
                        <td className="px-4 py-3 font-mono font-bold text-blue-500">{inv.invoiceCode}</td>
                        <td className="px-4 py-3 text-xs text-[rgb(var(--muted-foreground))]">{formatDate(inv.createdDate)}</td>
                        <td className="px-4 py-3 text-right font-bold">{formatCurrency(inv.grandTotal)}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-500">{formatCurrency(inv.totalPaid)}</td>
                        <td className="px-4 py-3 text-right font-bold text-amber-500">{formatCurrency(inv.remainingAmount)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn('px-2 py-0.5 rounded text-xs font-semibold border', invoiceStatusColors[inv.status])}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => navigate(`/invoices/${inv._id}`)} className="p-1 text-blue-500 hover:bg-blue-500/10 rounded">
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        )}

        {/* TAB 4: THANH TOÁN */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold">Lịch sử Lượt Thanh Toán ({payments.length})</h3>
            {payments.length === 0 ? (
              <p className="text-sm text-[rgb(var(--muted-foreground))] text-center py-12">Chưa ghi nhận lượt thanh toán nào</p>
            ) : (
              <div className="space-y-3">
                {payments.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-[rgb(var(--muted))]/40 border border-[rgb(var(--border))]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-emerald-500">+{formatCurrency(p.amount)}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                          {p.paymentMethod}
                        </span>
                        <span className="font-mono text-xs text-blue-500 font-semibold">({p.invoiceCode})</span>
                      </div>
                      <p className="text-xs text-[rgb(var(--muted-foreground))] mt-1">
                        Ngày: {formatDate(p.paymentDate)} • Mã GD: <strong>{p.paymentCode}</strong> {p.notes ? ` • ${p.notes}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: CÔNG NỢ */}
        {activeTab === 'debts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-[rgb(var(--border))]">
              <div>
                <h3 className="font-bold text-base text-[rgb(var(--foreground))]">
                  Chi Tiết Các Khoản Công Nợ Bán Hàng Phải Thu
                </h3>
                <p className="text-xs text-[rgb(var(--muted-foreground))]">
                  Liệt kê các hóa đơn chưa thu hết tiền, thời hạn thanh toán và số ngày còn lại/quá hạn
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs text-[rgb(var(--muted-foreground))]">Tổng Công Nợ Phải Thu Khách Hàng</div>
                <div className="text-2xl font-bold text-amber-500">
                  {formatCurrency(customer.totalDebt || 0)}
                </div>
              </div>
            </div>

            {activeDebts.length === 0 ? (
              <div className="p-8 text-center text-emerald-500 font-semibold text-sm bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                ✓ Khách hàng này hiện không còn khoản nợ nào với cửa hàng
              </div>
            ) : (
              <div className="space-y-3">
                {activeDebts
                  .sort((a, b) => b.remainingAmount - a.remainingAmount)
                  .map((inv) => {
                    const dueDateObj = inv.dueDate ? new Date(inv.dueDate) : new Date(new Date(inv.createdDate).getTime() + 14 * 86400000);
                    const diffTime = Date.now() - dueDateObj.getTime();
                    const isOverdue = diffTime > 0;
                    const overdueDays = isOverdue ? Math.ceil(diffTime / (1000 * 3600 * 24)) : 0;
                    const remainingDays = !isOverdue ? Math.ceil(Math.abs(diffTime) / (1000 * 3600 * 24)) : 0;

                    return (
                      <div
                        key={inv._id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          isOverdue
                            ? 'bg-red-500/5 border-red-500/30'
                            : 'bg-amber-500/5 border-amber-500/20'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-mono font-bold text-sm text-blue-500">
                              {inv.invoiceCode}
                            </span>
                            <span className="text-xs text-[rgb(var(--muted-foreground))]">
                              Ngày lập: {formatDate(inv.createdDate)}
                            </span>
                            <span className="text-xs text-[rgb(var(--muted-foreground))]">
                              • Hạn thanh toán: <strong>{formatDate(dueDateObj)}</strong>
                            </span>

                            {isOverdue ? (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                                🔴 Quá {overdueDays} ngày
                              </span>
                            ) : remainingDays <= 3 ? (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                🟡 Còn {remainingDays} ngày
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500">
                                🟢 Còn {remainingDays} ngày
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[rgb(var(--muted-foreground))] mt-1">
                            Tổng giá trị đơn: <strong>{formatCurrency(inv.grandTotal)}</strong> • Đã thanh toán: <strong className="text-emerald-500">{formatCurrency(inv.totalPaid)}</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-4 justify-between md:justify-end">
                          <div className="text-right">
                            <span className="text-[11px] text-[rgb(var(--muted-foreground))] block">Còn nợ đợt này</span>
                            <span className="text-lg font-extrabold text-amber-500">
                              {formatCurrency(inv.remainingAmount)}
                            </span>
                          </div>

                          <button
                            onClick={() => navigate(`/invoices/${inv._id}`)}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold hover:opacity-90 transition-all shadow-md shadow-emerald-500/20 whitespace-nowrap"
                          >
                            Thu Nợ Đơn Này
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: TIMELINE HOẠT ĐỘNG */}
        {activeTab === 'timeline' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold">Dòng Thời Gian Lịch Sử Hoạt Động ({activities.length})</h3>
            {activities.length === 0 ? (
              <p className="text-sm text-[rgb(var(--muted-foreground))] text-center py-12">Chưa có lịch sử hoạt động</p>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[rgb(var(--border))]">
                {activities.map((act) => (
                  <div key={act._id} className="relative flex items-start justify-between p-3.5 rounded-xl bg-[rgb(var(--muted))]/30 border border-[rgb(var(--border))]">
                    <div className="absolute -left-6 top-4 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-[rgb(var(--card))]" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
                          {act.action}
                        </span>
                        <span className="text-xs text-[rgb(var(--muted-foreground))]">{formatDate(act.createdAt)}</span>
                      </div>
                      <p className="text-sm font-semibold text-[rgb(var(--foreground))] mt-1">{act.description}</p>
                      <p className="text-xs text-[rgb(var(--muted-foreground))] mt-0.5">Thực hiện bởi: {act.performedBy}</p>
                    </div>
                    {act.amount !== undefined && (
                      <span className="font-bold text-sm text-emerald-500">
                        {formatCurrency(act.amount)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: GHI CHÚ NỘI BỘ */}
        {activeTab === 'notes' && (
          <div className="space-y-6">
            <h3 className="text-base font-bold">Ghi Chú & Nhật Ký Nội Bộ</h3>
            <div className="space-y-3">
              <textarea
                rows={4}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Thêm ghi chú mới về trao đổi với khách hàng..."
                className="w-full p-3.5 rounded-xl text-sm bg-[rgb(var(--muted))] border border-[rgb(var(--border))] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleAddNote}
                  disabled={addingNote || !newNote.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 disabled:opacity-50"
                >
                  {addingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Thêm Ghi Chú
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[rgb(var(--muted))]/30 border border-[rgb(var(--border))] whitespace-pre-wrap font-sans text-sm text-[rgb(var(--foreground))]">
              {customer.notes || 'Chưa có ghi chú nào.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
