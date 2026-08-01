import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Building,
  FileText,
  DollarSign,
  AlertCircle,
  Calendar,
  Package,
  CheckCircle,
} from 'lucide-react';
import api from '@/lib/api';
import type { SupplierRecord, PurchaseRecord, InventoryUnitRecord } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export function SupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [supplier, setSupplier] = useState<SupplierRecord | null>(null);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [purchasedUnits, setPurchasedUnits] = useState<InventoryUnitRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'purchases' | 'payments' | 'debt' | 'products'>('info');

  const fetchProfile = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api.get(`/suppliers/${id}/profile`);
      if (res.data.success) {
        setSupplier(res.data.data.supplier);
        setPurchases(res.data.data.purchases || []);
        setPayments(res.data.data.payments || []);
        setPurchasedUnits(res.data.data.purchasedUnits || []);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể tải thông tin Nhà cung cấp');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <div className="p-12 text-center text-sm text-[rgb(var(--muted-foreground))]">
        Đang tải thông tin Nhà cung cấp...
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="p-12 text-center space-y-4">
        <div className="text-base font-semibold text-[rgb(var(--foreground))]">
          Không tìm thấy nhà cung cấp
        </div>
        <button
          onClick={() => navigate('/suppliers')}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/suppliers')}
          className="p-2.5 rounded-xl border border-[rgb(var(--border))] text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] hover:bg-[rgb(var(--accent))] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 font-semibold">
              {supplier.supplierCode}
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-[rgb(var(--foreground))]">
              {supplier.name}
            </h1>
          </div>
          {supplier.companyName && (
            <p className="text-xs text-[rgb(var(--muted-foreground))] mt-0.5">
              {supplier.companyName}
            </p>
          )}
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm space-y-1">
          <div className="text-xs font-semibold text-[rgb(var(--muted-foreground))] uppercase">Tổng Tiền Đã Nhập</div>
          <div className="text-xl font-bold text-[rgb(var(--foreground))]">
            {formatCurrency(supplier.totalPurchased || 0)}
          </div>
          <div className="text-xs text-[rgb(var(--muted-foreground))]">{supplier.purchaseCount || 0} lần nhập hàng</div>
        </div>

        <div className="p-5 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm space-y-1">
          <div className="text-xs font-semibold text-emerald-500 uppercase">Đã Thanh Toán</div>
          <div className="text-xl font-bold text-emerald-500">
            {formatCurrency(supplier.totalPaid || 0)}
          </div>
          <div className="text-xs text-[rgb(var(--muted-foreground))]">{payments.length} đợt thanh toán</div>
        </div>

        <div className="p-5 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm space-y-1">
          <div className="text-xs font-semibold text-amber-500 uppercase">Còn Nợ NCC</div>
          <div className="text-xl font-bold text-amber-500">
            {formatCurrency(supplier.totalDebt || 0)}
          </div>
          <div className="text-xs text-[rgb(var(--muted-foreground))]">Số dư nợ còn lại</div>
        </div>

        <div className="p-5 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm space-y-1">
          <div className="text-xs font-semibold text-[rgb(var(--muted-foreground))] uppercase">Lần Nhập Gần Nhất</div>
          <div className="text-base font-bold text-[rgb(var(--foreground))]">
            {supplier.lastPurchaseDate ? formatDate(supplier.lastPurchaseDate) : 'Chưa nhập hàng'}
          </div>
          <div className="text-xs text-[rgb(var(--muted-foreground))]">Ngày giao dịch gần nhất</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-[rgb(var(--border))] gap-6">
        {[
          { key: 'info', label: 'Thông Tin Liên Hệ' },
          { key: 'purchases', label: `Lịch Sử Nhập Hàng (${purchases.length})` },
          { key: 'payments', label: `Lịch Sử Thanh Toán (${payments.length})` },
          { key: 'debt', label: 'Công Nợ' },
          { key: 'products', label: `Sản Phẩm Đã Nhập (${purchasedUnits.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`pb-3 text-sm font-semibold transition-colors relative ${
              activeTab === tab.key
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {/* Tab 1: Info */}
        {activeTab === 'info' && (
          <div className="p-6 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] space-y-6">
            <h3 className="font-bold text-base text-[rgb(var(--foreground))]">Hồ Sơ Nhà Cung Cấp</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-medium text-[rgb(var(--muted-foreground))]">Tên NCC</div>
                    <div className="text-sm font-semibold text-[rgb(var(--foreground))]">{supplier.name}</div>
                  </div>
                </div>

                {supplier.companyName && (
                  <div className="flex items-start gap-3">
                    <Building className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-medium text-[rgb(var(--muted-foreground))]">Tên Công Ty</div>
                      <div className="text-sm font-medium text-[rgb(var(--foreground))]">{supplier.companyName}</div>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-medium text-[rgb(var(--muted-foreground))]">Số Điện Thoại / Zalo</div>
                    <div className="text-sm font-medium text-[rgb(var(--foreground))]">
                      {supplier.phone || 'Chưa cập nhật'} {supplier.zalo ? `(Zalo: ${supplier.zalo})` : ''}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-medium text-[rgb(var(--muted-foreground))]">Email</div>
                    <div className="text-sm font-medium text-[rgb(var(--foreground))]">{supplier.email || 'Chưa cập nhật'}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-medium text-[rgb(var(--muted-foreground))]">Địa Chỉ</div>
                    <div className="text-sm font-medium text-[rgb(var(--foreground))]">{supplier.address || 'Chưa cập nhật'}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-medium text-[rgb(var(--muted-foreground))]">Mã Số Thuế</div>
                    <div className="text-sm font-medium text-[rgb(var(--foreground))]">{supplier.taxCode || 'Chưa cập nhật'}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-medium text-[rgb(var(--muted-foreground))]">Tài Khoản Ngân Hàng</div>
                    <div className="text-sm font-medium text-[rgb(var(--foreground))]">
                      {supplier.accountNumber ? `${supplier.accountNumber} - ${supplier.bankName || ''}` : 'Chưa cập nhật'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {supplier.notes && (
              <div className="pt-4 border-t border-[rgb(var(--border))]">
                <div className="text-xs font-medium text-[rgb(var(--muted-foreground))] mb-1">Ghi Chú</div>
                <div className="text-sm bg-[rgb(var(--muted))/30] p-3 rounded-xl text-[rgb(var(--foreground))]">
                  {supplier.notes}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Purchases */}
        {activeTab === 'purchases' && (
          <div className="rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] overflow-hidden shadow-sm">
            {purchases.length === 0 ? (
              <div className="p-8 text-center text-sm text-[rgb(var(--muted-foreground))]">
                Chưa có phiếu nhập hàng nào từ nhà cung cấp này
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-[rgb(var(--muted))/50] text-[rgb(var(--muted-foreground))] text-xs font-semibold uppercase border-b border-[rgb(var(--border))]">
                  <tr>
                    <th className="px-5 py-3.5">Mã Phiếu</th>
                    <th className="px-5 py-3.5">Ngày Nhập</th>
                    <th className="px-5 py-3.5 text-right">Tổng Tiền</th>
                    <th className="px-5 py-3.5 text-right">Đã Trả</th>
                    <th className="px-5 py-3.5 text-right">Còn Nợ</th>
                    <th className="px-5 py-3.5 text-center">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgb(var(--border))]">
                  {purchases.map((p) => (
                    <tr key={p._id} className="hover:bg-[rgb(var(--accent))/30]">
                      <td className="px-5 py-4 font-mono font-semibold text-blue-500 text-xs">
                        {p.purchaseCode}
                      </td>
                      <td className="px-5 py-4 text-xs text-[rgb(var(--foreground))]">
                        {formatDate(p.purchaseDate)}
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-[rgb(var(--foreground))]">
                        {formatCurrency(p.totalAmount)}
                      </td>
                      <td className="px-5 py-4 text-right text-emerald-500 font-medium">
                        {formatCurrency(p.paidAmount)}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-amber-500">
                        {formatCurrency(p.remainingAmount)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                            p.status === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : p.status === 'PARTIALLY_PAID'
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-red-500/10 text-red-500'
                          }`}
                        >
                          {p.status === 'PAID' ? 'Đã Thanh Toán' : p.status === 'PARTIALLY_PAID' ? 'Trả 1 Phần' : 'Chưa Trả'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 3: Payments */}
        {activeTab === 'payments' && (
          <div className="rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] overflow-hidden shadow-sm">
            {payments.length === 0 ? (
              <div className="p-8 text-center text-sm text-[rgb(var(--muted-foreground))]">
                Chưa có lịch sử thanh toán nào cho nhà cung cấp này
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-[rgb(var(--muted))/50] text-[rgb(var(--muted-foreground))] text-xs font-semibold uppercase border-b border-[rgb(var(--border))]">
                  <tr>
                    <th className="px-5 py-3.5">Mã Giao Dịch</th>
                    <th className="px-5 py-3.5">Phiếu Nhập</th>
                    <th className="px-5 py-3.5">Ngày Thanh Toán</th>
                    <th className="px-5 py-3.5">Hình Thức</th>
                    <th className="px-5 py-3.5 text-right">Số Tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgb(var(--border))]">
                  {payments.map((pm, idx) => (
                    <tr key={idx} className="hover:bg-[rgb(var(--accent))/30]">
                      <td className="px-5 py-4 font-mono font-semibold text-xs text-blue-500">
                        {pm.paymentCode}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-[rgb(var(--muted-foreground))]">
                        {pm.purchaseCode}
                      </td>
                      <td className="px-5 py-4 text-xs text-[rgb(var(--foreground))]">
                        {formatDate(pm.paymentDate)}
                      </td>
                      <td className="px-5 py-4 text-xs font-medium">
                        {pm.paymentMethod} {pm.bankName ? `(${pm.bankName})` : ''}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-emerald-500">
                        {formatCurrency(pm.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 4: Debt */}
        {activeTab === 'debt' && (
          <div className="p-6 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-[rgb(var(--border))]">
              <div>
                <h3 className="font-bold text-base text-[rgb(var(--foreground))]">
                  Chi Tiết Danh Sách Công Nợ Theo Đợt Nhập Hàng
                </h3>
                <p className="text-xs text-[rgb(var(--muted-foreground))]">
                  Liệt kê các phiếu nhập hàng còn thiếu tiền, xếp theo khoản nợ từ cao xuống thấp
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs text-[rgb(var(--muted-foreground))]">Tổng Công Nợ Phải Trả NCC</div>
                <div className="text-2xl font-bold text-amber-500">
                  {formatCurrency(supplier.totalDebt || 0)}
                </div>
              </div>
            </div>

            {supplier.totalDebt === 0 ? (
              <div className="p-8 text-center text-emerald-500 font-semibold text-sm bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                ✓ Bạn hoàn toàn không còn khoản nợ nào với nhà cung cấp này
              </div>
            ) : (
              <div className="space-y-3">
                {purchases
                  .filter((p) => p.remainingAmount > 0)
                  .sort((a, b) => b.remainingAmount - a.remainingAmount)
                  .map((p) => {
                    const isOverdue = p.dueDate && new Date(p.dueDate).getTime() < Date.now();
                    const daysDiff = p.dueDate ? Math.ceil((new Date(p.dueDate).getTime() - Date.now()) / (1000 * 3600 * 24)) : null;

                    return (
                      <div
                        key={p._id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          isOverdue
                            ? 'bg-red-500/5 border-red-500/30'
                            : 'bg-amber-500/5 border-amber-500/20'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-mono font-bold text-sm text-blue-500">
                              {p.purchaseCode}
                            </span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-[rgb(var(--muted))] text-[rgb(var(--foreground))]">
                              📅 Ngày nhập: {formatDate(p.purchaseDate)}
                            </span>
                            {p.dueDate && (
                              <span
                                className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                                  isOverdue
                                    ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                }`}
                              >
                                {isOverdue
                                  ? `🚨 Quá hạn ${Math.abs(daysDiff || 0)} ngày (Hạn: ${formatDate(p.dueDate)})`
                                  : `⏳ Còn ${daysDiff} ngày đến hạn (${formatDate(p.dueDate)})`}
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-[rgb(var(--muted-foreground))]">
                            Sản phẩm nhập: <strong>{p.items?.map((it) => it.productName).join(', ')}</strong>
                          </div>

                          <div className="text-xs text-[rgb(var(--muted-foreground))] pt-0.5">
                            Tổng tiền phiếu: <strong>{formatCurrency(p.totalAmount)}</strong> • Đã trả: <strong className="text-emerald-500">{formatCurrency(p.paidAmount)}</strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 self-end md:self-center">
                          <div className="text-right">
                            <div className="text-xs text-[rgb(var(--muted-foreground))] font-medium">Còn Nợ Đợt Này</div>
                            <div className="text-lg font-bold text-amber-500">
                              {formatCurrency(p.remainingAmount)}
                            </div>
                          </div>
                          <Link
                            to={`/purchases?search=${p.purchaseCode}`}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-500/20 transition-smooth"
                          >
                            Trả Nợ Phiếu Này
                          </Link>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Products */}
        {activeTab === 'products' && (
          <div className="rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] overflow-hidden shadow-sm">
            {purchasedUnits.length === 0 ? (
              <div className="p-8 text-center text-sm text-[rgb(var(--muted-foreground))]">
                Chưa có thiết bị / serial nào được nhập từ nhà cung cấp này
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-[rgb(var(--muted))/50] text-[rgb(var(--muted-foreground))] text-xs font-semibold uppercase border-b border-[rgb(var(--border))]">
                  <tr>
                    <th className="px-5 py-3.5">Serial</th>
                    <th className="px-5 py-3.5">Sản Phẩm</th>
                    <th className="px-5 py-3.5">Ngày Nhập</th>
                    <th className="px-5 py-3.5 text-right">Giá Nhập</th>
                    <th className="px-5 py-3.5">BH NCC</th>
                    <th className="px-5 py-3.5 text-center">Trạng Thái Kho</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgb(var(--border))]">
                  {purchasedUnits.map((u) => (
                    <tr key={u._id} className="hover:bg-[rgb(var(--accent))/30]">
                      <td className="px-5 py-4 font-mono font-bold text-xs text-blue-500">
                        {u.serialNumber}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-xs text-[rgb(var(--foreground))]">
                          {u.productName}
                        </div>
                        <div className="text-[11px] font-mono text-[rgb(var(--muted-foreground))]">
                          {u.productCode}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-[rgb(var(--foreground))]">
                        {formatDate(u.purchaseDate)}
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-[rgb(var(--foreground))]">
                        {formatCurrency(u.purchasePrice)}
                      </td>
                      <td className="px-5 py-4 text-xs text-[rgb(var(--foreground))]">
                        {u.supplierWarrantyMonths} tháng (Hạn: {formatDate(u.supplierWarrantyEndDate)})
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${
                            u.status === 'AVAILABLE'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : u.status === 'RESERVED'
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-blue-500/10 text-blue-500'
                          }`}
                        >
                          {u.status === 'AVAILABLE'
                            ? 'Còn hàng'
                            : u.status === 'RESERVED'
                            ? 'Đang giữ (HĐ)'
                            : 'Đã bán'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
