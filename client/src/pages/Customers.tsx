import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn, formatCurrency, formatDate, customerTypeColors, getInitialsAvatarUrl } from '@/lib/utils';
import { CustomerType } from '@/types';
import type { CustomerRecord, CustomerStats } from '@/types';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Users, Search, Plus, Eye, Edit, Trash2, ChevronLeft, ChevronRight,
  TrendingUp, AlertCircle, Building2, UserCheck, ShieldAlert, X, Save, Loader2, Phone, Mail, MapPin, Tag, CreditCard,
} from 'lucide-react';

export function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: currentPage,
        limit: 15,
      };
      if (search.trim()) params.search = search.trim();
      if (typeFilter) params.customerType = typeFilter;

      const [res, statsRes] = await Promise.all([
        api.get('/customers', { params }),
        api.get('/customers/stats'),
      ]);

      setCustomers(res.data.data);
      setTotalItems(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
      setStats(statsRes.data.data);
    } catch {
      toast.error('Không thể tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, typeFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Bạn có chắc chắn muốn xóa hồ sơ khách hàng này?')) return;
    try {
      await api.delete(`/customers/${id}`);
      toast.success('Đã xóa khách hàng');
      fetchCustomers();
    } catch {
      toast.error('Không thể xóa khách hàng');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trung Tâm Khách Hàng (CRM)</h1>
          <p className="text-sm text-[rgb(var(--muted-foreground))] mt-1">
            Quản lý hồ sơ khách hàng toàn diện, vòng đời doanh thu, công nợ và lịch sử tương tác
          </p>
        </div>

        <button
          onClick={() => {
            setEditingCustomer(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-semibold hover:opacity-90 transition-smooth shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          Thêm Khách Hàng Mới
        </button>
      </div>

      {/* CRM Summary Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[rgb(var(--muted-foreground))] uppercase">Tổng Doanh Thu</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-[rgb(var(--foreground))] mt-2">{formatCurrency(stats.totalRevenue)}</p>
            <p className="text-[11px] text-[rgb(var(--muted-foreground))] mt-1">Số tiền hàng đã bán ra</p>
          </div>

          <div className="p-4 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[rgb(var(--muted-foreground))] uppercase">Tổng Thực Nhận</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-emerald-500 mt-2">{formatCurrency(stats.totalPaid)}</p>
            <p className="text-[11px] text-[rgb(var(--muted-foreground))] mt-1">Số tiền khách đã thực trả</p>
          </div>

          <div className="p-4 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[rgb(var(--muted-foreground))] uppercase">Tổng Công Nợ Khách</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-amber-500 mt-2">{formatCurrency(stats.totalDebt)}</p>
            <p className="text-[11px] text-[rgb(var(--muted-foreground))] mt-1">Số tiền khách còn nợ lại</p>
          </div>

          <div className="p-4 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[rgb(var(--muted-foreground))] uppercase">Lợi Nhuận Gộp (Nếu Đủ)</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-purple-500 mt-2">{formatCurrency(stats.totalProfit)}</p>
            <p className="text-[11px] text-[rgb(var(--muted-foreground))] mt-1">Tổng lời nếu khách trả đủ</p>
          </div>

          <div className="p-4 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[rgb(var(--muted-foreground))] uppercase">Tổng Khách Hàng</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-indigo-500 mt-2">{stats.totalCustomers}</p>
            <p className="text-[11px] text-[rgb(var(--muted-foreground))] mt-1">Hồ sơ khách hàng CRM</p>
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
            placeholder="Tìm theo Mã KH, Tên, Số điện thoại, Tên công ty, Email..."
            className={cn(
              'w-full pl-10 pr-4 py-2.5 rounded-xl text-sm',
              'bg-[rgb(var(--muted))] border border-[rgb(var(--border))]',
              'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50',
              'transition-smooth'
            )}
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm bg-[rgb(var(--card))] border border-[rgb(var(--border))] focus:outline-none"
        >
          <option value="">Tất cả phân loại</option>
          {Object.values(CustomerType).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Customer DataTable */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
              <div className="skeleton w-1/3 h-5 mb-2" />
              <div className="skeleton w-1/4 h-4" />
            </div>
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-20 text-[rgb(var(--muted-foreground))]">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Chưa có khách hàng nào trong hệ thống CRM</p>
          <p className="text-sm mt-1">Bấm <strong>"Thêm Khách Hàng Mới"</strong> hoặc tự động lưu khi tạo Báo giá / Hóa đơn.</p>
        </div>
      ) : (
        <div className="hidden md:block rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[rgb(var(--muted))]/50 border-b border-[rgb(var(--border))] text-[11px] font-semibold text-[rgb(var(--muted-foreground))] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Mã KH / Avatar</th>
                  <th className="px-4 py-3">Khách Hàng / Công Ty</th>
                  <th className="px-4 py-3">Liên Hệ (SĐT / Email)</th>
                  <th className="px-4 py-3 text-center">Phân Loại</th>
                  <th className="px-4 py-3 text-center">Số Đơn</th>
                  <th className="px-4 py-3 text-right">Tổng Doanh Thu</th>
                  <th className="px-4 py-3 text-right">Công Nợ</th>
                  <th className="px-4 py-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--border))]">
                {customers.map((c) => {
                  const avatar = c.avatarUrl || getInitialsAvatarUrl(c.name);
                  const isDebt = (c.totalDebt || 0) > 0;
                  return (
                    <tr
                      key={c._id}
                      onClick={() => navigate(`/customers/${c._id}`)}
                      className="hover:bg-[rgb(var(--accent))] transition-smooth cursor-pointer"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <img src={avatar} alt="" className="w-9 h-9 rounded-full object-cover border border-[rgb(var(--border))]" />
                          <span className="font-bold font-mono text-blue-500 text-xs">{c.customerCode}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-sm text-[rgb(var(--foreground))]">{c.name}</p>
                        {c.companyName && (
                          <p className="text-xs text-[rgb(var(--muted-foreground))] font-medium">{c.companyName}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs font-semibold">{c.phone || '---'}</p>
                        <p className="text-[11px] text-[rgb(var(--muted-foreground))]">{c.email || '---'}</p>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={cn('px-2.5 py-0.5 rounded-lg text-xs border', customerTypeColors[c.customerType] || '')}>
                          {c.customerType}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold">
                        {c.totalOrders || 0}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-blue-500">
                        {formatCurrency(c.totalRevenue || 0)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold">
                        <span className={isDebt ? 'text-amber-500' : 'text-[rgb(var(--muted-foreground))]'}>
                          {formatCurrency(c.totalDebt || 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/customers/${c._id}`)}
                            className="p-1.5 rounded-lg hover:bg-[rgb(var(--accent))] text-blue-500"
                            title="Xem chi tiết hồ sơ CRM"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingCustomer(c);
                              setShowAddModal(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-[rgb(var(--accent))] text-[rgb(var(--muted-foreground))]"
                            title="Chỉnh sửa"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(c._id, e)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500"
                            title="Xóa khách hàng"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Mobile Card List */}
      {customers.length > 0 && (
        <div className="md:hidden space-y-3">
          {customers.map((c) => {
            const avatar = c.avatarUrl || getInitialsAvatarUrl(c.name);
            const isDebt = (c.totalDebt || 0) > 0;
            return (
              <div
                key={c._id}
                onClick={() => navigate(`/customers/${c._id}`)}
                className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm active:bg-[rgb(var(--accent))] transition-smooth cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <img src={avatar} alt="" className="w-11 h-11 rounded-full object-cover border border-[rgb(var(--border))] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm truncate">{c.name}</p>
                      <span className={cn('px-2 py-0.5 rounded-lg text-[10px] border flex-shrink-0', customerTypeColors[c.customerType] || '')}>
                        {c.customerType}
                      </span>
                    </div>
                    {c.companyName && (
                      <p className="text-xs text-[rgb(var(--muted-foreground))] font-medium truncate">{c.companyName}</p>
                    )}
                    <p className="text-[11px] font-mono text-blue-500 font-bold mt-0.5">{c.customerCode}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-[rgb(var(--border))]">
                  <span className="text-[rgb(var(--muted-foreground))]">{c.phone || '---'}</span>
                  <span className="text-[rgb(var(--muted-foreground))]">{c.totalOrders || 0} đơn</span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="rounded-xl bg-[rgb(var(--muted))]/40 px-3 py-2">
                    <p className="text-[10px] text-[rgb(var(--muted-foreground))] uppercase">Doanh thu</p>
                    <p className="text-sm font-bold text-blue-500">{formatCurrency(c.totalRevenue || 0)}</p>
                  </div>
                  <div className="rounded-xl bg-[rgb(var(--muted))]/40 px-3 py-2">
                    <p className="text-[10px] text-[rgb(var(--muted-foreground))] uppercase">Công nợ</p>
                    <p className={cn('text-sm font-bold', isDebt ? 'text-amber-500' : 'text-[rgb(var(--muted-foreground))]')}>
                      {formatCurrency(c.totalDebt || 0)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-[rgb(var(--border))]" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => navigate(`/customers/${c._id}`)}
                    className="p-2 rounded-lg hover:bg-[rgb(var(--accent))] text-blue-500"
                    title="Xem chi tiết hồ sơ CRM"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingCustomer(c);
                      setShowAddModal(true);
                    }}
                    className="p-2 rounded-lg hover:bg-[rgb(var(--accent))] text-[rgb(var(--muted-foreground))]"
                    title="Chỉnh sửa"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(c._id, e)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-red-500"
                    title="Xóa khách hàng"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-[rgb(var(--border))]">
          <p className="text-xs text-[rgb(var(--muted-foreground))]">
            Trang {currentPage} / {totalPages} (Tổng {totalItems} khách hàng)
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

      {/* Modal Thêm / Sửa Khách Hàng */}
      {showAddModal && (
        <CustomerModal
          customer={editingCustomer}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchCustomers();
          }}
        />
      )}
    </div>
  );
}

// Customer Form Modal
function CustomerModal({
  customer,
  onClose,
  onSuccess,
}: {
  customer: CustomerRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(customer?.name || '');
  const [companyName, setCompanyName] = useState(customer?.companyName || '');
  const [contactPerson, setContactPerson] = useState(customer?.contactPerson || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [secondaryPhone, setSecondaryPhone] = useState(customer?.secondaryPhone || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [facebook, setFacebook] = useState(customer?.facebook || '');
  const [zalo, setZalo] = useState(customer?.zalo || '');
  const [address, setAddress] = useState(customer?.address || '');
  const [taxCode, setTaxCode] = useState(customer?.taxCode || '');
  const [notes, setNotes] = useState(customer?.notes || '');
  const [customerType, setCustomerType] = useState<CustomerType>(customer?.customerType || CustomerType.RETAIL);
  const [saving, setSaving] = useState(false);
  const [showMore, setShowMore] = useState(
    Boolean(
      customer?.companyName || customer?.contactPerson || customer?.secondaryPhone ||
      customer?.email || customer?.taxCode || customer?.facebook || customer?.zalo ||
      customer?.address || customer?.notes
    )
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Vui lòng nhập tên khách hàng');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        companyName: companyName.trim() || undefined,
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.trim() || undefined,
        secondaryPhone: secondaryPhone.trim() || undefined,
        email: email.trim() || undefined,
        facebook: facebook.trim() || undefined,
        zalo: zalo.trim() || undefined,
        address: address.trim() || undefined,
        taxCode: taxCode.trim() || undefined,
        notes: notes.trim() || undefined,
        customerType,
      };

      if (customer) {
        await api.put(`/customers/${customer._id}`, payload);
        toast.success('Đã cập nhật hồ sơ khách hàng');
      } else {
        await api.post('/customers', payload);
        toast.success('Đã khởi tạo khách hàng mới');
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi lưu thông tin khách hàng');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = cn(
    'w-full px-4 py-2 rounded-xl text-sm',
    'bg-[rgb(var(--muted))] border border-[rgb(var(--border))]',
    'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50',
    'transition-smooth'
  );

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className={cn(
        'fixed inset-x-4 top-[8%] max-h-[85vh] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[650px]',
        'rounded-2xl border shadow-2xl z-50 overflow-hidden flex flex-col',
        'bg-[rgb(var(--card))] border-[rgb(var(--border))]',
        'animate-scale-in'
      )}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgb(var(--border))]">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            <h2 className="text-base font-bold">
              {customer ? `Chỉnh Sửa Hồ Sơ CRM: ${customer.customerCode}` : 'Thêm Hồ Sơ Khách Hàng Mới'}
            </h2>
          </div>
          <button type="button" onClick={onClose}>
            <X className="w-5 h-5 text-[rgb(var(--muted-foreground))]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden flex-1 min-h-0">
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold mb-1 block">Tên Khách Hàng / Họ Tên *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="VD: Anh Nam PC"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold mb-1 block">Phân Loại Khách Hàng *</label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value as CustomerType)}
                className={inputClass}
              >
                {Object.values(CustomerType).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold mb-1 block">Số Điện Thoại Chính *</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
                placeholder="VD: 0901.234.567"
              />
            </div>
          </div>

          {!showMore && (
            <button
              type="button"
              onClick={() => setShowMore(true)}
              className="text-xs font-semibold text-blue-500 hover:underline"
            >
              + Thêm thông tin công ty / liên hệ khác (không bắt buộc)
            </button>
          )}

          {showMore && (
            <div className="space-y-4 pt-1 border-t border-[rgb(var(--border))] mt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                <div>
                  <label className="text-xs font-semibold mb-1 block">Tên Công Ty (Nếu có)</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className={inputClass}
                    placeholder="VD: Công ty TNHH Máy Tính NP"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold mb-1 block">Người Liên Hệ Chính</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className={inputClass}
                    placeholder="VD: Anh Nam (Trưởng phòng IT)"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold mb-1 block">Số Điện Thoại Phụ</label>
                  <input
                    type="text"
                    value={secondaryPhone}
                    onChange={(e) => setSecondaryPhone(e.target.value)}
                    className={inputClass}
                    placeholder="VD: 0988.765.432"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold mb-1 block">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="VD: nam@company.com"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold mb-1 block">Mã Số Thuế</label>
                  <input
                    type="text"
                    value={taxCode}
                    onChange={(e) => setTaxCode(e.target.value)}
                    className={inputClass}
                    placeholder="VD: 0101234567"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold mb-1 block">Link Facebook</label>
                  <input
                    type="text"
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                    className={inputClass}
                    placeholder="VD: facebook.com/nam.computer"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold mb-1 block">Số Zalo</label>
                  <input
                    type="text"
                    value={zalo}
                    onChange={(e) => setZalo(e.target.value)}
                    className={inputClass}
                    placeholder="VD: 0901234567"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block">Địa Chỉ Giao Hàng / Trụ Sở</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={inputClass}
                  placeholder="VD: 123 Đường Lê Thanh Nghị, Hai Bà Trưng, Hà Nội"
                />
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block">Ghi Chú Nội Bộ</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={inputClass}
                  placeholder="Ghi chú sở thích, lưu ý giao nhận..."
                />
              </div>
            </div>
          )}
        </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[rgb(var(--border))] flex-shrink-0">
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
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-semibold hover:opacity-90 transition-smooth disabled:opacity-50 shadow-lg shadow-blue-500/25"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {customer ? 'Lưu Cập Nhật' : 'Tạo Khách Hàng'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
