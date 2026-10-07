import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Building,
  FileText,
  DollarSign,
  AlertCircle,
  ExternalLink,
  X,
  CheckCircle,
} from 'lucide-react';
import api from '@/lib/api';
import type { SupplierRecord, SupplierStats } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export function Suppliers() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [stats, setStats] = useState<SupplierStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [hasDebtOnly, setHasDebtOnly] = useState(false);

  // Modal create supplier
  const [showModal, setShowModal] = useState(false);
  const [showMoreSupplier, setShowMoreSupplier] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    phone: '',
    zalo: '',
    email: '',
    address: '',
    taxCode: '',
    accountNumber: '',
    bankName: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const [listRes, statsRes] = await Promise.all([
        api.get('/suppliers', { params: { search, hasDebtOnly: hasDebtOnly ? true : undefined, limit: 100 } }),
        api.get('/suppliers/stats'),
      ]);

      if (listRes.data.success) {
        setSuppliers(listRes.data.data);
      }
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể tải danh sách Nhà cung cấp');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search, hasDebtOnly]);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên Nhà cung cấp');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/suppliers', formData);
      if (res.data.success) {
        toast.success(`Đã thêm nhà cung cấp: ${res.data.data.name}`);
        setShowModal(false);
        setShowMoreSupplier(false);
        setFormData({
          name: '',
          companyName: '',
          phone: '',
          zalo: '',
          email: '',
          address: '',
          taxCode: '',
          accountNumber: '',
          bankName: '',
          notes: '',
        });
        fetchSuppliers();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể tạo Nhà cung cấp');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[rgb(var(--foreground))]">
            Nhà Cung Cấp
          </h1>
          <p className="text-sm text-[rgb(var(--muted-foreground))] mt-1">
            Quản lý đối tác cung ứng hàng hóa, theo dõi lịch sử nhập hàng và công nợ NCC
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Nhà Cung Cấp</span>
        </button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-blue-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Tổng Nhà Cung Cấp</span>
              <Building2 className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-[rgb(var(--foreground))]">
              {stats.totalSuppliers}
            </div>
            <p className="text-xs text-[rgb(var(--muted-foreground))]">Đã đăng ký trong hệ thống</p>
          </div>

          <div className="p-5 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-indigo-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Tổng Tiền Đã Nhập</span>
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-[rgb(var(--foreground))]">
              {formatCurrency(stats.totalPurchased)}
            </div>
            <p className="text-xs text-[rgb(var(--muted-foreground))]">Giá trị hàng hóa mua vào</p>
          </div>

          <div className="p-5 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-emerald-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Đã Thanh Toán NCC</span>
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-emerald-500">
              {formatCurrency(stats.totalPaid)}
            </div>
            <p className="text-xs text-[rgb(var(--muted-foreground))]">Tiền đã chi trả nhà cung cấp</p>
          </div>

          <div className="p-5 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-amber-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Còn Nợ Nhà Cung Cấp</span>
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-amber-500">
              {formatCurrency(stats.totalDebt)}
            </div>
            <p className="text-xs text-[rgb(var(--muted-foreground))]">Khoản nợ chưa thanh toán</p>
          </div>
        </div>
      )}

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))]">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[rgb(var(--muted-foreground))]" />
          <input
            type="text"
            placeholder="Tìm theo Mã NCC, Tên NCC, Tên công ty, SĐT, Email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] focus:outline-none focus:ring-2 focus:ring-blue-500 text-[rgb(var(--foreground))]"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setHasDebtOnly(!hasDebtOnly)}
            className={`px-4 py-2 rounded-xl text-xs font-medium border transition-colors ${
              hasDebtOnly
                ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 font-semibold'
                : 'bg-[rgb(var(--background))] text-[rgb(var(--muted-foreground))] border-[rgb(var(--border))]'
            }`}
          >
            Chỉ nhà cung cấp có nợ
          </button>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-sm text-[rgb(var(--muted-foreground))]">
            Đang tải danh sách nhà cung cấp...
          </div>
        ) : suppliers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Building2 className="w-12 h-12 text-[rgb(var(--muted-foreground))] mx-auto stroke-1" />
            <div className="text-base font-semibold text-[rgb(var(--foreground))]">
              Chưa có nhà cung cấp nào
            </div>
            <p className="text-xs text-[rgb(var(--muted-foreground))] max-w-sm mx-auto">
              Thêm Nhà cung cấp quen thuộc để dễ dàng tạo phiếu nhập hàng và quản lý công nợ.
            </p>
          </div>
        ) : (
          <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[rgb(var(--muted))/50] text-[rgb(var(--muted-foreground))] text-xs font-semibold uppercase border-b border-[rgb(var(--border))]">
                <tr>
                  <th className="px-5 py-3.5">Mã NCC</th>
                  <th className="px-5 py-3.5">Nhà Cung Cấp</th>
                  <th className="px-5 py-3.5">Liên Hệ</th>
                  <th className="px-5 py-3.5 text-right">Tổng Nhập</th>
                  <th className="px-5 py-3.5 text-right">Đã Trả</th>
                  <th className="px-5 py-3.5 text-right">Còn Nợ</th>
                  <th className="px-5 py-3.5 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--border))]">
                {suppliers.map((s) => (
                  <tr
                    key={s._id}
                    onClick={() => navigate(`/suppliers/${s._id}`)}
                    className="hover:bg-[rgb(var(--accent))/50] cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-4 font-mono font-semibold text-blue-500 text-xs">
                      {s.supplierCode}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-[rgb(var(--foreground))]">{s.name}</div>
                      {s.companyName && (
                        <div className="text-xs text-[rgb(var(--muted-foreground))] font-normal">
                          {s.companyName}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 space-y-1">
                      {s.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-[rgb(var(--foreground))]">
                          <Phone className="w-3.5 h-3.5 text-blue-500" />
                          <span>{s.phone}</span>
                        </div>
                      )}
                      {s.email && (
                        <div className="flex items-center gap-1.5 text-xs text-[rgb(var(--muted-foreground))]">
                          <Mail className="w-3.5 h-3.5 text-[rgb(var(--muted-foreground))]" />
                          <span>{s.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-[rgb(var(--foreground))]">
                      {formatCurrency(s.totalPurchased || 0)}
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-emerald-500">
                      {formatCurrency(s.totalPaid || 0)}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold">
                      {(s.totalDebt || 0) > 0 ? (
                        <span className="text-amber-500">{formatCurrency(s.totalDebt)}</span>
                      ) : (
                        <span className="text-xs text-[rgb(var(--muted-foreground))]">0 ₫</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/suppliers/${s._id}`);
                        }}
                        className="p-2 rounded-xl hover:bg-blue-500/10 text-blue-500 transition-colors"
                        title="Xem chi tiết"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-[rgb(var(--border))]">
            {suppliers.map((s) => (
              <div
                key={s._id}
                onClick={() => navigate(`/suppliers/${s._id}`)}
                className="p-4 active:bg-[rgb(var(--accent))/50] cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{s.name}</p>
                    {s.companyName && (
                      <p className="text-xs text-[rgb(var(--muted-foreground))] truncate">{s.companyName}</p>
                    )}
                    <p className="font-mono font-semibold text-blue-500 text-xs mt-0.5">{s.supplierCode}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/suppliers/${s._id}`);
                    }}
                    className="p-2 rounded-xl hover:bg-blue-500/10 text-blue-500 transition-colors flex-shrink-0"
                    title="Xem chi tiết"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>

                {(s.phone || s.email) && (
                  <div className="flex items-center gap-3 mt-2 text-xs text-[rgb(var(--muted-foreground))]">
                    {s.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-blue-500" />
                        {s.phone}
                      </span>
                    )}
                    {s.email && (
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="w-3.5 h-3.5" />
                        {s.email}
                      </span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div>
                    <p className="text-[10px] text-[rgb(var(--muted-foreground))] uppercase">Tổng Nhập</p>
                    <p className="text-xs font-medium">{formatCurrency(s.totalPurchased || 0)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[rgb(var(--muted-foreground))] uppercase">Đã Trả</p>
                    <p className="text-xs font-medium text-emerald-500">{formatCurrency(s.totalPaid || 0)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[rgb(var(--muted-foreground))] uppercase">Còn Nợ</p>
                    {(s.totalDebt || 0) > 0 ? (
                      <p className="text-xs font-semibold text-amber-500">{formatCurrency(s.totalDebt)}</p>
                    ) : (
                      <p className="text-xs text-[rgb(var(--muted-foreground))]">0 ₫</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      {/* Modal Add Supplier */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-2xl w-full max-w-xl shadow-2xl animate-fade-in flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[rgb(var(--border))] bg-[rgb(var(--muted))/30] flex-shrink-0">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-base text-[rgb(var(--foreground))]">
                  Thêm Nhà Cung Cấp Mới
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--accent))]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="flex flex-col overflow-hidden flex-1 min-h-0">
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                    Tên Nhà Cung Cấp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: CTY Tin Học SPC, Viễn Sơn, An Phát..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                    Số Điện Thoại
                  </label>
                  <input
                    type="text"
                    placeholder="0988..."
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
                  />
                </div>
              </div>

              {!showMoreSupplier && (
                <button
                  type="button"
                  onClick={() => setShowMoreSupplier(true)}
                  className="text-xs font-semibold text-blue-500 hover:underline"
                >
                  + Thêm thông tin công ty / ngân hàng khác (không bắt buộc)
                </button>
              )}

              {showMoreSupplier && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[rgb(var(--border))]">
                  <div>
                    <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                      Tên Công Ty (Nếu có)
                    </label>
                    <input
                      type="text"
                      placeholder="Công ty TNHH..."
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="sales@supplier.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                      Mã Số Thuế
                    </label>
                    <input
                      type="text"
                      placeholder="0101234567"
                      value={formData.taxCode}
                      onChange={(e) => setFormData({ ...formData, taxCode: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                      Số Tài Khoản
                    </label>
                    <input
                      type="text"
                      placeholder="1903..."
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                      Ngân Hàng
                    </label>
                    <input
                      type="text"
                      placeholder="MB Bank, Vietcombank..."
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                      Địa Chỉ
                    </label>
                    <input
                      type="text"
                      placeholder="Địa chỉ nhà cung cấp..."
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                      Ghi Chú
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ghi chú thêm về điều khoản bảo hành, chiết khấu..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
                    />
                  </div>
                </div>
              )}
            </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[rgb(var(--border))] flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--accent))]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {submitting ? 'Đang tạo...' : 'Tạo Nhà Cung Cấp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
