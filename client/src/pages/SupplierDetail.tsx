import { useState, useEffect, Fragment } from 'react';
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
  ChevronDown,
  ChevronUp,
  Truck,
  ExternalLink,
  User,
  Receipt,
  Clock,
  ArrowRight,
  X,
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

  // Expandable Purchase rows in Tab 2
  const [expandedPurchases, setExpandedPurchases] = useState<Record<string, boolean>>({});

  const toggleExpandPurchase = (pId: string) => {
    setExpandedPurchases((prev) => ({ ...prev, [pId]: !prev[pId] }));
  };

  // Customer Detail Modal for sold products
  const [selectedCustomerInfo, setSelectedCustomerInfo] = useState<InventoryUnitRecord['customerInfo'] | null>(null);

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
                    <th className="px-5 py-3.5">Mặt Hàng</th>
                    <th className="px-5 py-3.5 text-right">Tổng Tiền</th>
                    <th className="px-5 py-3.5 text-right">Đã Trả</th>
                    <th className="px-5 py-3.5 text-right">Còn Nợ</th>
                    <th className="px-5 py-3.5 text-center">Trạng Thái</th>
                    <th className="px-5 py-3.5 text-center">Chi Tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgb(var(--border))]">
                  {purchases.map((p) => {
                    const isExpanded = Boolean(expandedPurchases[p._id]);
                    const totalQty = (p.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0);

                    return (
                      <Fragment key={p._id}>
                        <tr
                          onClick={() => toggleExpandPurchase(p._id)}
                          className={`cursor-pointer transition-colors ${
                            isExpanded
                              ? 'bg-blue-500/5 hover:bg-blue-500/10'
                              : 'hover:bg-[rgb(var(--accent))/30]'
                          }`}
                        >
                          <td className="px-5 py-4 font-mono font-semibold text-blue-500 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5" />
                              <span>{p.purchaseCode}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-xs text-[rgb(var(--foreground))]">
                            {formatDate(p.purchaseDate)}
                          </td>
                          <td className="px-5 py-4 text-xs text-[rgb(var(--muted-foreground))]">
                            <span className="font-semibold text-[rgb(var(--foreground))]">{p.items?.length || 0} SP</span> ({totalQty} cái)
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
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                  : p.status === 'PARTIALLY_PAID'
                                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                  : 'bg-red-500/10 text-red-500 border border-red-500/20'
                              }`}
                            >
                              {p.status === 'PAID' ? 'Đã Thanh Toán' : p.status === 'PARTIALLY_PAID' ? 'Trả 1 Phần' : 'Chưa Trả'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpandPurchase(p._id);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-all ${
                                isExpanded
                                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  : 'bg-[rgb(var(--muted))] text-[rgb(var(--foreground))] hover:bg-[rgb(var(--accent))] border border-[rgb(var(--border))]'
                              }`}
                            >
                              <span>{isExpanded ? 'Thu gọn' : 'Chi tiết'}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>

                        {/* Accordion Sub-Row for Purchase Details */}
                        {isExpanded && (
                          <tr className="bg-[rgb(var(--muted))/20] border-b border-[rgb(var(--border))]">
                            <td colSpan={8} className="p-4 pl-8 sm:pl-12">
                              <div className="space-y-4">
                                {/* SECTION 1: SẢN PHẨM TRONG PHIẾU NHẬP */}
                                <div className="p-4 rounded-xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 font-bold text-xs text-blue-400">
                                      <Package className="w-4 h-4" />
                                      <span>Danh Sách Sản Phẩm Trong Phiếu Nhập {p.purchaseCode} ({p.items?.length || 0} loại SP):</span>
                                    </div>
                                    <Link
                                      to={`/purchases?search=${p.purchaseCode}`}
                                      className="text-xs font-semibold text-blue-500 hover:underline inline-flex items-center gap-1"
                                    >
                                      <span>Mở trang phiếu nhập</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </Link>
                                  </div>

                                  <div className="overflow-x-auto rounded-lg border border-[rgb(var(--border))]">
                                    <table className="w-full text-left text-xs">
                                      <thead className="bg-[rgb(var(--muted))/60] text-[10px] uppercase font-semibold text-[rgb(var(--muted-foreground))] border-b border-[rgb(var(--border))]">
                                        <tr>
                                          <th className="px-3.5 py-2.5">Mã SP</th>
                                          <th className="px-3.5 py-2.5">Tên Sản Phẩm</th>
                                          <th className="px-3.5 py-2.5">Tình Trạng</th>
                                          <th className="px-3.5 py-2.5 text-center">SL</th>
                                          <th className="px-3.5 py-2.5 text-right">Đơn Giá Nhập</th>
                                          <th className="px-3.5 py-2.5 text-right">Thành Tiền</th>
                                          <th className="px-3.5 py-2.5">Serial & Trạng Thái Bán Ra</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[rgb(var(--border))]">
                                        {(p.items || []).map((it, itIdx) => (
                                          <tr key={itIdx} className="hover:bg-[rgb(var(--accent))/20]">
                                            <td className="px-3.5 py-3 font-mono font-semibold text-blue-500">
                                              {it.productCode}
                                            </td>
                                            <td className="px-3.5 py-3 font-medium text-[rgb(var(--foreground))]">
                                              {it.productName}
                                            </td>
                                            <td className="px-3.5 py-3">
                                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                {it.condition || 'New'}
                                              </span>
                                            </td>
                                            <td className="px-3.5 py-3 text-center font-bold">
                                              {it.quantity}
                                            </td>
                                            <td className="px-3.5 py-3 text-right font-medium text-[rgb(var(--foreground))]">
                                              {formatCurrency(it.costPrice)}
                                            </td>
                                            <td className="px-3.5 py-3 text-right font-bold text-[rgb(var(--foreground))]">
                                              {formatCurrency(it.total)}
                                            </td>
                                            <td className="px-3.5 py-3">
                                              {it.serialDetails && it.serialDetails.length > 0 ? (
                                                <div className="space-y-1.5">
                                                  {it.serialDetails.map((snUnit: any, snIdx: number) => {
                                                    const isSold = snUnit.status === 'SOLD';
                                                    const isReserved = snUnit.status === 'RESERVED';

                                                    return (
                                                      <div
                                                        key={snIdx}
                                                        className="flex items-center gap-2 flex-wrap text-[11px] p-1.5 rounded-lg bg-[rgb(var(--background))] border border-[rgb(var(--border))]"
                                                      >
                                                        <span className="font-mono font-bold text-emerald-400">
                                                          S/N: {snUnit.serialNumber}
                                                        </span>

                                                        <span
                                                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                                            isSold
                                                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                                              : isReserved
                                                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                                              : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                                          }`}
                                                        >
                                                          {isSold ? 'Đã bán' : isReserved ? 'Đang giữ (HĐ)' : 'Còn trong kho'}
                                                        </span>

                                                        {snUnit.customerInfo && (
                                                          <button
                                                            type="button"
                                                            onClick={() => setSelectedCustomerInfo(snUnit.customerInfo)}
                                                            className="text-purple-400 hover:text-purple-300 hover:underline inline-flex items-center gap-1 font-semibold group"
                                                            title="Click để xem thông tin khách hàng"
                                                          >
                                                            <User className="w-3 h-3 text-purple-400 group-hover:scale-110 transition-transform" />
                                                            <span>Khách: {snUnit.customerInfo.customerName}</span>
                                                          </button>
                                                        )}

                                                        {snUnit.customerInfo?.sellerName && (
                                                          <span className="text-[10px] text-[rgb(var(--muted-foreground))]">
                                                            (Người bán: {snUnit.customerInfo.sellerName})
                                                          </span>
                                                        )}

                                                        {(snUnit.customerInfo?.invoiceCode || snUnit.soldInvoiceCode || snUnit.reservedByInvoiceCode) && (
                                                          <button
                                                            type="button"
                                                            onClick={() =>
                                                              navigate(
                                                                `/invoices/${
                                                                  snUnit.customerInfo?.invoiceId ||
                                                                  snUnit.soldInvoiceId ||
                                                                  snUnit.reservedByInvoiceId
                                                                }`
                                                              )
                                                            }
                                                            className="font-mono font-bold text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20"
                                                            title="Click để mở hóa đơn bán"
                                                          >
                                                            <Receipt className="w-3 h-3" />
                                                            <span>
                                                              HĐ: {snUnit.customerInfo?.invoiceCode || snUnit.soldInvoiceCode || snUnit.reservedByInvoiceCode}
                                                            </span>
                                                            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                                                          </button>
                                                        )}
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              ) : (
                                                <span className="text-[rgb(var(--muted-foreground))] italic">
                                                  Không lưu serial
                                                </span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                {/* SECTION 2: CÔNG NỢ & LỊCH SỬ THANH TOÁN CỦA PHIẾU NHẬP */}
                                <div className="p-4 rounded-xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm space-y-3">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[rgb(var(--border))]">
                                    <div className="flex items-center gap-2 font-bold text-xs text-amber-500">
                                      <CreditCard className="w-4 h-4" />
                                      <span>Tình Trạng Công Nợ & Các Đợt Thanh Toán Của Phiếu {p.purchaseCode}:</span>
                                    </div>

                                    <div className="flex items-center gap-4 text-xs">
                                      <div>
                                        Tổng tiền: <strong className="text-[rgb(var(--foreground))]">{formatCurrency(p.totalAmount)}</strong>
                                      </div>
                                      <div>
                                        Đã trả: <strong className="text-emerald-500">{formatCurrency(p.paidAmount)}</strong>
                                      </div>
                                      <div>
                                        Còn nợ: <strong className="text-amber-500">{formatCurrency(p.remainingAmount)}</strong>
                                      </div>
                                      {p.remainingAmount > 0 && (
                                        <Link
                                          to={`/purchases?search=${p.purchaseCode}`}
                                          className="px-2.5 py-1 rounded-lg font-semibold bg-emerald-600 text-white hover:bg-emerald-500 text-xs inline-flex items-center gap-1 shadow-sm"
                                        >
                                          <span>+ Trả Nợ Phiếu Này</span>
                                          <ArrowRight className="w-3 h-3" />
                                        </Link>
                                      )}
                                    </div>
                                  </div>

                                  {p.payments && p.payments.length > 0 ? (
                                    <div className="overflow-x-auto rounded-lg border border-[rgb(var(--border))]">
                                      <table className="w-full text-left text-xs">
                                        <thead className="bg-[rgb(var(--muted))/60] text-[10px] uppercase font-semibold text-[rgb(var(--muted-foreground))] border-b border-[rgb(var(--border))]">
                                          <tr>
                                            <th className="px-3 py-2">Mã GD</th>
                                            <th className="px-3 py-2">Ngày Trả</th>
                                            <th className="px-3 py-2">Hình Thức</th>
                                            <th className="px-3 py-2">Ghi Chú</th>
                                            <th className="px-3 py-2 text-right">Số Tiền Trả</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[rgb(var(--border))]">
                                          {p.payments.map((pm: any, pmIdx: number) => (
                                            <tr key={pmIdx} className="hover:bg-[rgb(var(--accent))/20]">
                                              <td className="px-3 py-2 font-mono font-semibold text-blue-500">
                                                {pm.paymentCode}
                                              </td>
                                              <td className="px-3 py-2 text-[rgb(var(--foreground))]">
                                                {formatDate(pm.paymentDate || pm.createdAt)}
                                              </td>
                                              <td className="px-3 py-2 font-medium">
                                                {pm.paymentMethod} {pm.bankName ? `(${pm.bankName})` : ''}
                                              </td>
                                              <td className="px-3 py-2 text-[rgb(var(--muted-foreground))]">
                                                {pm.note || '—'}
                                              </td>
                                              <td className="px-3 py-2 text-right font-bold text-emerald-500">
                                                {formatCurrency(pm.amount)}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <div className="text-xs text-[rgb(var(--muted-foreground))] italic p-2">
                                      Chưa có đợt thanh toán nào được ghi nhận cho phiếu này.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
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
                        <Link to={`/purchases?search=${pm.purchaseCode}`} className="text-blue-400 hover:underline">
                          {pm.purchaseCode}
                        </Link>
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
                            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-500/20 transition-smooth inline-flex items-center gap-1.5"
                          >
                            <span>Trả Nợ Phiếu Này</span>
                            <ArrowRight className="w-3.5 h-3.5" />
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
                    <th className="px-5 py-3.5">Serial Number</th>
                    <th className="px-5 py-3.5">Sản Phẩm</th>
                    <th className="px-5 py-3.5">Phiếu Nhập</th>
                    <th className="px-5 py-3.5">Ngày Nhập</th>
                    <th className="px-5 py-3.5 text-right">Giá Nhập</th>
                    <th className="px-5 py-3.5">BH NCC</th>
                    <th className="px-5 py-3.5 text-center">Trạng Thái / Thông Tin Bán Ra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgb(var(--border))]">
                  {purchasedUnits.map((u) => {
                    const isSold = u.status === 'SOLD';
                    const isReserved = u.status === 'RESERVED';

                    return (
                      <tr key={u._id} className="hover:bg-[rgb(var(--accent))/30] transition-colors">
                        <td className="px-5 py-4 font-mono font-bold text-xs text-blue-500">
                          {u.serialNumber || <span className="text-[rgb(var(--muted-foreground))] italic">Không có S/N</span>}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-xs text-[rgb(var(--foreground))]">
                            {u.productName}
                          </div>
                          <div className="text-[11px] font-mono text-[rgb(var(--muted-foreground))]">
                            {u.productCode}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {u.purchaseCode ? (
                            <Link
                              to={`/purchases?search=${u.purchaseCode}`}
                              className="font-mono text-xs text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20"
                            >
                              <Truck className="w-3 h-3" />
                              <span>{u.purchaseCode}</span>
                            </Link>
                          ) : (
                            <span className="text-xs text-[rgb(var(--muted-foreground))]">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs text-[rgb(var(--foreground))]">
                          {formatDate(u.purchaseDate)}
                        </td>
                        <td className="px-5 py-4 text-right font-medium text-[rgb(var(--foreground))]">
                          {formatCurrency(u.purchasePrice)}
                        </td>
                        <td className="px-5 py-4 text-xs text-[rgb(var(--foreground))]">
                          <div>{u.supplierWarrantyMonths} tháng</div>
                          <div className="text-[10px] text-[rgb(var(--muted-foreground))]">
                            (Hạn: {formatDate(u.supplierWarrantyEndDate)})
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${
                                isSold
                                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                  : isReserved
                                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                  : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              }`}
                            >
                              {isSold ? 'Đã bán' : isReserved ? 'Đang giữ (HĐ)' : 'Còn hàng'}
                            </span>

                            {u.customerInfo && (
                              <div className="flex flex-col items-center gap-0.5 mt-0.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedCustomerInfo(u.customerInfo || null)}
                                  className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 hover:underline inline-flex items-center gap-1 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 max-w-[150px] truncate group"
                                  title="Click để xem thông tin người mua"
                                >
                                  <User className="w-3 h-3 flex-shrink-0 text-purple-400 group-hover:scale-110 transition-transform" />
                                  <span className="truncate">{u.customerInfo.customerName}</span>
                                </button>

                                {u.customerInfo.sellerName && (
                                  <span className="text-[10px] text-[rgb(var(--muted-foreground))]">
                                    Người bán: {u.customerInfo.sellerName}
                                  </span>
                                )}

                                {(u.customerInfo.invoiceCode || u.soldInvoiceCode || u.reservedByInvoiceCode) && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      navigate(
                                        `/invoices/${
                                          u.customerInfo?.invoiceId || u.soldInvoiceId || u.reservedByInvoiceId
                                        }`
                                      )
                                    }
                                    className="text-[10px] font-mono font-bold text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20"
                                    title="Click để nhảy ra hóa đơn bán"
                                  >
                                    <Receipt className="w-3 h-3" />
                                    <span>
                                      HĐ: {u.customerInfo.invoiceCode || u.soldInvoiceCode || u.reservedByInvoiceCode}
                                    </span>
                                    <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Customer Quick Modal Dialog */}
      {selectedCustomerInfo && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-[rgb(var(--border))] flex items-center justify-between bg-[rgb(var(--muted))/30]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[rgb(var(--foreground))]">
                    Thông Tin Khách Hàng
                  </h3>
                  <p className="text-[11px] text-[rgb(var(--muted-foreground))]">
                    Khách đã mua / đặt giữ sản phẩm nhập từ nhà cung cấp này
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomerInfo(null)}
                className="p-1.5 rounded-lg text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--accent))]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="p-3.5 rounded-xl bg-[rgb(var(--background))] border border-[rgb(var(--border))] space-y-2.5">
                <div className="flex items-center justify-between border-b border-[rgb(var(--border))] pb-2">
                  <span className="text-[rgb(var(--muted-foreground))]">Tên khách hàng:</span>
                  <span className="font-bold text-sm text-[rgb(var(--foreground))]">
                    {selectedCustomerInfo.customerName}
                  </span>
                </div>

                {selectedCustomerInfo.customerPhone && (
                  <div className="flex items-center justify-between">
                    <span className="text-[rgb(var(--muted-foreground))] flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      <span>Số điện thoại:</span>
                    </span>
                    <a
                      href={`tel:${selectedCustomerInfo.customerPhone}`}
                      className="font-mono font-semibold text-blue-500 hover:underline"
                    >
                      {selectedCustomerInfo.customerPhone}
                    </a>
                  </div>
                )}

                {selectedCustomerInfo.customerAddress && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[rgb(var(--muted-foreground))] flex items-center gap-1 flex-shrink-0">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Địa chỉ:</span>
                    </span>
                    <span className="text-right text-[rgb(var(--foreground))]">
                      {selectedCustomerInfo.customerAddress}
                    </span>
                  </div>
                )}

                {selectedCustomerInfo.customerEmail && (
                  <div className="flex items-center justify-between">
                    <span className="text-[rgb(var(--muted-foreground))] flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email:</span>
                    </span>
                    <span className="text-[rgb(var(--foreground))] font-mono">
                      {selectedCustomerInfo.customerEmail}
                    </span>
                  </div>
                )}

                {selectedCustomerInfo.sellerName && (
                  <div className="flex items-center justify-between">
                    <span className="text-[rgb(var(--muted-foreground))] flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      <span>Người bán / Nhân viên:</span>
                    </span>
                    <span className="font-semibold text-[rgb(var(--foreground))]">
                      {selectedCustomerInfo.sellerName}
                    </span>
                  </div>
                )}

                {selectedCustomerInfo.invoiceCode && (
                  <div className="flex items-center justify-between pt-2 border-t border-[rgb(var(--border))]">
                    <span className="text-[rgb(var(--muted-foreground))] flex items-center gap-1">
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Hóa đơn bán ra:</span>
                    </span>
                    <span className="font-mono font-bold text-blue-500">
                      {selectedCustomerInfo.invoiceCode}
                    </span>
                  </div>
                )}

                {selectedCustomerInfo.soldAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-[rgb(var(--muted-foreground))] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Ngày bán:</span>
                    </span>
                    <span>{formatDate(selectedCustomerInfo.soldAt)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                {selectedCustomerInfo.customerId && (
                  <button
                    type="button"
                    onClick={() => {
                      navigate(`/customers/${selectedCustomerInfo.customerId}`);
                    }}
                    className="flex-1 py-2 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-500 inline-flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20"
                  >
                    <span>Xem Hồ Sơ Khách Hàng</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}

                {selectedCustomerInfo.invoiceId && (
                  <button
                    type="button"
                    onClick={() => {
                      navigate(`/invoices/${selectedCustomerInfo.invoiceId}`);
                    }}
                    className="flex-1 py-2 rounded-xl font-semibold bg-[rgb(var(--muted))] text-[rgb(var(--foreground))] hover:bg-[rgb(var(--accent))] inline-flex items-center justify-center gap-1.5 border border-[rgb(var(--border))]"
                  >
                    <span>Xem Hóa Đơn Bán</span>
                    <Receipt className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
