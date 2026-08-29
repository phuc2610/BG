import { useEffect, useState, useCallback, Fragment } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { cn, formatCurrency, formatDate, invoiceStatusColors } from '@/lib/utils';
import { InvoiceStatus, PaymentMethod } from '@/types';
import type { Invoice, InvoiceItem, InventoryUnitRecord, IReturnExchangeTransaction } from '@/types';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Printer, Download, CreditCard, Plus, FileText,
  User, Calendar, DollarSign, Package, CheckCircle2, Clock,
  AlertCircle, ShieldCheck, X, Loader2, Save, Trash2, Tag, ExternalLink,
  Check, Lock, CheckSquare, RotateCcw, ArrowRightLeft,
  Truck, ChevronDown, ChevronUp,
} from 'lucide-react';
import { ReturnExchangeModal } from '@/components/invoice/ReturnExchangeModal';

export function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  // Serial Selection Modal State
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [availableSerials, setAvailableSerials] = useState<InventoryUnitRecord[]>([]);
  const [selectedSerials, setSelectedSerials] = useState<string[]>([]);
  const [loadingSerials, setLoadingSerials] = useState(false);
  const [savingSerials, setSavingSerials] = useState(false);

  // Serial Units Purchase Info Map (serialNumber -> InventoryUnitRecord)
  const [serialUnitsMap, setSerialUnitsMap] = useState<Record<string, InventoryUnitRecord>>({});
  // Item Origin Tracking Details (itemIndex -> array of origins)
  const [itemOriginsMap, setItemOriginsMap] = useState<Record<number, any[]>>({});
  // Expanded accordions for items to view purchase details
  const [expandedSerialItems, setExpandedSerialItems] = useState<Record<number, boolean>>({});

  const toggleExpandSerialItem = (idx: number) => {
    setExpandedSerialItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Finalize Invoice State
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizePaid, setFinalizePaid] = useState<number>(0);
  const [finalizeDueDate, setFinalizeDueDate] = useState<string>('');
  const [submittingFinalize, setSubmittingFinalize] = useState(false);

  // Payment Record Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Return / Exchange Modal & History State
  const [showReturnExchangeModal, setShowReturnExchangeModal] = useState(false);
  const [returnHistory, setReturnHistory] = useState<IReturnExchangeTransaction[]>([]);

  const fetchSerialUnits = useCallback(async (serials: string[]) => {
    const validSerials = Array.from(new Set(serials.filter(Boolean)));
    if (validSerials.length === 0) return;
    try {
      const res = await api.post('/inventory-units/by-serials', { serials: validSerials });
      if (res.data.success && Array.isArray(res.data.data)) {
        const newMap: Record<string, InventoryUnitRecord> = {};
        res.data.data.forEach((u: InventoryUnitRecord) => {
          if (u.serialNumber) {
            newMap[u.serialNumber] = u;
          }
        });
        setSerialUnitsMap((prev) => ({ ...prev, ...newMap }));
      }
    } catch (err) {
      console.error('Error fetching serial unit details:', err);
    }
  }, []);

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [resInv, resHistory, resOrigins] = await Promise.all([
        api.get(`/invoices/${id}`),
        api.get(`/invoices/${id}/return-exchange-history`),
        api.get(`/invoices/${id}/origin-details`).catch(() => ({ data: { success: false, data: [] } })),
      ]);
      setInvoice(resInv.data.data);
      setFinalizePaid(resInv.data.data.totalPaid || 0);
      if (resInv.data.data.dueDate) {
        setFinalizeDueDate(new Date(resInv.data.data.dueDate).toISOString().split('T')[0]);
      }
      if (resHistory.data.success) {
        setReturnHistory(resHistory.data.data);
      }
      if (resOrigins.data.success && Array.isArray(resOrigins.data.data)) {
        const map: Record<number, any[]> = {};
        resOrigins.data.data.forEach((obj: any) => {
          map[obj.itemIndex] = obj.origins || [];
        });
        setItemOriginsMap(map);
      }

      // Collect all serials across items and fetch purchase info
      const allSerials = (resInv.data.data.items || []).flatMap((it: InvoiceItem) =>
        it.selectedSerials && it.selectedSerials.length > 0
          ? it.selectedSerials
          : it.serialNumber ? [it.serialNumber] : []
      );
      if (allSerials.length > 0) {
        fetchSerialUnits(allSerials);
      }
    } catch {
      toast.error('Không thể tải thông tin hóa đơn');
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, fetchSerialUnits]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  // Open Serial Selection Modal for line item
  const handleOpenSerialModal = async (itemIdx: number) => {
    if (!invoice || invoice.isFinalized) return;
    const item = invoice.items[itemIdx];
    const productId =
      item.productId ||
      (item.productSnapshot as any)?.productId ||
      (item.productSnapshot as any)?._id ||
      (item.productSnapshot as any)?.productCode ||
      (typeof item.inventoryItem === 'string' ? item.inventoryItem : (item.inventoryItem as any)?._id);

    setActiveItemIndex(itemIdx);
    setSelectedSerials(item.selectedSerials || []);

    if (!productId) {
      toast.error('Không tìm thấy thông tin sản phẩm để tra cứu Serial');
      return;
    }

    try {
      setLoadingSerials(true);
      const res = await api.get(`/inventory-units/by-product/${productId}`);
      if (res.data.success) {
        const units = res.data.data.filter(
          (u: InventoryUnitRecord) =>
            u.status === 'AVAILABLE' ||
            (u.status === 'RESERVED' && u.reservedByInvoiceId === invoice._id)
        );
        setAvailableSerials(units);
      }
    } catch (err: any) {
      toast.error('Không thể tải danh sách Serial khả dụng');
    } finally {
      setLoadingSerials(false);
    }
  };

  const handleSaveSerials = async () => {
    if (activeItemIndex === null || !invoice) return;
    const item = invoice.items[activeItemIndex];

    if (selectedSerials.length > item.quantity) {
      toast.error(`Chỉ được chọn tối đa ${item.quantity} Serial cho mục này`);
      return;
    }

    try {
      setSavingSerials(true);
      const res = await api.post(`/invoices/${invoice._id}/select-serials`, {
        itemIndex: activeItemIndex,
        selectedSerials,
      });

      if (res.data.success) {
        toast.success(`Đã cập nhật ${selectedSerials.length}/${item.quantity} Serial cho sản phẩm`);
        setInvoice(res.data.data);
        if (selectedSerials.length > 0) {
          fetchSerialUnits(selectedSerials);
          // Auto-expand purchase origin info so the user sees the purchase code immediately
          setExpandedSerialItems((prev) => ({ ...prev, [activeItemIndex]: true }));
        }
        setActiveItemIndex(null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể lưu danh sách Serial');
    } finally {
      setSavingSerials(false);
    }
  };

  const toggleSerialSelection = (sn: string, requiredQty: number) => {
    if (selectedSerials.includes(sn)) {
      setSelectedSerials(selectedSerials.filter((s) => s !== sn));
    } else {
      if (selectedSerials.length >= requiredQty) {
        toast.error(`Số lượng sản phẩm là ${requiredQty}, không thể chọn thêm Serial`);
        return;
      }
      setSelectedSerials([...selectedSerials, sn]);
    }
  };

  const handleFinalizeInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    const remaining = Math.max(0, invoice.grandTotal - finalizePaid);
    if (remaining > 0 && !finalizeDueDate) {
      toast.error('Khách còn nợ tiền. Vui lòng chọn HẠN THANH TOÁN CÔNG NỢ KHÁCH HÀNG');
      return;
    }

    try {
      setSubmittingFinalize(true);
      const res = await api.post(`/invoices/${invoice._id}/finalize`, {
        paidAmount: finalizePaid,
        dueDate: remaining > 0 ? finalizeDueDate : undefined,
      });

      if (res.data.success) {
        toast.success(`🎉 Đã CHỐT HÓA ĐƠN ${invoice.invoiceCode} và trừ kho thành công!`);
        setShowFinalizeModal(false);
        fetchInvoice();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể chốt hóa đơn');
    } finally {
      setSubmittingFinalize(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    setDownloadingPdf(true);
    try {
      const response = await api.get(`/pdf/invoices/${invoice._id}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invoice.invoiceCode}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Đã tải PDF hóa đơn thành công!');
    } catch {
      toast.error('Không thể tải PDF hóa đơn');
    } finally {
      setDownloadingPdf(false);
    }

  };

  const handlePrint = () => {
    if (!invoice) return;
    const apiUrl = import.meta.env.VITE_API_URL || '/api';
    window.open(`${apiUrl}/pdf/invoices/${invoice._id}/html`, '_blank');
  };

  if (loading || !invoice) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const isFinalized = invoice.isFinalized || false;
  const isDraft = !isFinalized;
  const isDebt = invoice.remainingAmount > 0;
  const isPaidInFull = invoice.remainingAmount <= 0;

  // Check if any items are non-returned/non-exchanged
  const hasEligibleItems = invoice.items.some((item) => (item.itemStatus || 'SOLD') === 'SOLD');

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-12">
      {/* Top Navigation & Status Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button
          onClick={() => navigate('/invoices')}
          className="flex items-center gap-2 text-sm text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] font-medium transition-smooth"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại Danh sách Hóa Đơn
        </button>

        <div className="flex items-center gap-3 flex-wrap">
          {isDraft && (
            <button
              onClick={() => setShowFinalizeModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 transition-all transform hover:-translate-y-0.5"
            >
              <CheckSquare className="w-4 h-4" />
              CHỐT HÓA ĐƠN (TRỪ KHO)
            </button>
          )}

          {isFinalized && invoice.status !== InvoiceStatus.CANCELLED && hasEligibleItems && (
            <button
              onClick={() => setShowReturnExchangeModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-bold shadow-lg shadow-amber-500/20 hover:opacity-90 transition-smooth"
            >
              <RotateCcw className="w-4 h-4" />
              Trả / Đổi Hàng
            </button>
          )}

          {isFinalized && isDebt && invoice.status !== InvoiceStatus.CANCELLED && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold hover:opacity-90 transition-smooth shadow-lg shadow-emerald-500/20"
            >
              <CreditCard className="w-4 h-4" />
              Thu Tiền Nợ
            </button>
          )}

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] text-sm font-medium hover:bg-[rgb(var(--accent))] transition-smooth"
          >
            <Printer className="w-4 h-4" />
            In Hóa Đơn
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-smooth shadow-md shadow-blue-500/20 disabled:opacity-50"
          >
            {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Xuất PDF
          </button>
        </div>
      </div>

      {/* Draft Mode Notice Banner */}
      {isDraft && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-amber-500 flex-shrink-0" />
            <div>
              <div className="text-sm font-bold text-amber-500">
                HÓA ĐƠN ĐANG Ở TRẠNG THÁI NHÁP (CHƯA TRỪ KHO)
              </div>
              <div className="text-xs text-[rgb(var(--muted-foreground))] mt-0.5">
                Vui lòng chọn đầy đủ Serial cho sản phẩm và nhấp nút <strong>"CHỐT HÓA ĐƠN"</strong> để xuất bán và trừ kho thực tế.
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowFinalizeModal(true)}
            className="px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-500/20 hover:bg-amber-600 whitespace-nowrap"
          >
            Chốt Hóa Đơn Ngay
          </button>
        </div>
      )}

      {/* Main Invoice Card Header */}
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 space-y-6 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-4 border-b border-[rgb(var(--border))] pb-6">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold font-mono text-blue-500">{invoice.invoiceCode}</h1>
              {isFinalized ? (
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase tracking-wide flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  ĐÃ CHỐT HÓA ĐƠN ({invoice.status})
                </span>
              ) : (
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 uppercase tracking-wide flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  HÓA ĐƠN NHÁP
                </span>
              )}
            </div>
            <p className="text-xs text-[rgb(var(--muted-foreground))] mt-1">
              Ngày tạo: {formatDate(invoice.createdDate)}
              {invoice.finalizedAt && ` • Ngày chốt: ${formatDate(invoice.finalizedAt)}`}
            </p>
          </div>

          {/* Two-Way Link to Original Quote */}
          {invoice.quoteId && (
            <Link
              to={`/quotes/${invoice.quoteId}`}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-500/10 text-blue-500 text-xs font-semibold hover:bg-blue-500/20 transition-smooth border border-blue-500/20"
            >
              <FileText className="w-4 h-4" />
              Xem Báo Giá Gốc ({invoice.quoteCode})
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {/* Customer Information Block */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-[rgb(var(--muted))]/30 border border-[rgb(var(--border))]">
          <div>
            <span className="text-[11px] font-bold text-[rgb(var(--muted-foreground))] uppercase tracking-wide block mb-2">
              Thông Tin Khách Hàng
            </span>
            <p className="text-base font-bold text-[rgb(var(--foreground))]">{invoice.customer.name}</p>
            <p className="text-xs text-[rgb(var(--muted-foreground))] mt-1">SĐT: <strong className="text-[rgb(var(--foreground))]">{invoice.customer.phone || '---'}</strong></p>
            <p className="text-xs text-[rgb(var(--muted-foreground))] mt-0.5">Địa chỉ: {invoice.customer.address || '---'}</p>
          </div>

          <div>
            <span className="text-[11px] font-bold text-[rgb(var(--muted-foreground))] uppercase tracking-wide block mb-2">
              Tình Trạng Thanh Toán & Công Nợ
            </span>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[rgb(var(--muted-foreground))]">Tổng tiền hóa đơn:</span>
                <span className="font-bold text-[rgb(var(--foreground))]">{formatCurrency(invoice.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-500 font-semibold">
                <span>Đã thanh toán:</span>
                <span>-{formatCurrency(invoice.totalPaid)}</span>
              </div>
              <div className="flex justify-between border-t border-[rgb(var(--border))] pt-1 font-bold text-sm">
                <span>Còn nợ phải thu:</span>
                <span className={isDebt ? 'text-amber-500' : 'text-emerald-500'}>
                  {formatCurrency(invoice.remainingAmount)}
                </span>
              </div>
              {invoice.dueDate && (
                <div className="flex justify-between text-xs text-amber-600 font-semibold pt-1">
                  <span>Hạn thanh toán công nợ:</span>
                  <span>{formatDate(invoice.dueDate)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Product Items Table with Serial Selection & Status Badges */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[rgb(var(--foreground))]">
              Danh Sách Sản Phẩm Hóa Đơn ({invoice.items.length})
            </h3>
          </div>

          <div className="rounded-xl border border-[rgb(var(--border))] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[rgb(var(--muted))]/50 border-b border-[rgb(var(--border))] text-[10px] font-semibold text-[rgb(var(--muted-foreground))] uppercase">
                <tr>
                  <th className="px-4 py-2.5 w-10">STT</th>
                  <th className="px-4 py-2.5">Sản Phẩm</th>
                  <th className="px-4 py-2.5 text-center">Bảo Hành</th>
                  <th className="px-4 py-2.5 text-right">Đơn Giá</th>
                  <th className="px-4 py-2.5 text-center">SL</th>
                  <th className="px-4 py-2.5 text-right">Thành Tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--border))]">
                {invoice.items.map((item, idx) => {
                  const selectedCount = (item.selectedSerials || []).length;
                  const itemSerials =
                    item.selectedSerials && item.selectedSerials.length > 0
                      ? item.selectedSerials
                      : item.serialNumber
                      ? [item.serialNumber]
                      : [];

                  return (
                    <Fragment key={idx}>
                      <tr className="hover:bg-[rgb(var(--accent))]/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-[rgb(var(--muted-foreground))]">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[rgb(var(--muted))] overflow-hidden flex-shrink-0">
                              {item.productSnapshot.imageUrl ? (
                                <img src={item.productSnapshot.imageUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-4 h-4 opacity-30" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-sm">{item.productSnapshot.name}</p>
                                {item.itemStatus === 'RETURNED' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                    [ĐÃ TRẢ]
                                  </span>
                                )}
                                {item.itemStatus === 'EXCHANGED' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                    [ĐÃ ĐỔI]
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="font-mono text-[11px] text-blue-500">{item.productSnapshot.productCode}</span>
                                {item.serialNumber && (
                                  <span className="font-mono text-[11px] text-[rgb(var(--muted-foreground))]">
                                    • S/N: {item.serialNumber}
                                  </span>
                                )}
                                {isDraft && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenSerialModal(idx)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                                      selectedCount > 0
                                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                        : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                                    }`}
                                  >
                                    {selectedCount > 0 ? `✓ Serial (${selectedCount}/${item.quantity})` : `+ Chọn Serial / Đơn Nhập`}
                                  </button>
                                )}

                                {/* Nguồn gốc nhập button (always visible for all items) */}
                                {(() => {
                                  const origins = itemOriginsMap[idx] || [];
                                  const hasSerials = itemSerials.length > 0;
                                  const hasOrigins = origins.length > 0;

                                  return (
                                    <button
                                      type="button"
                                      onClick={() => toggleExpandSerialItem(idx)}
                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all inline-flex items-center gap-1 shadow-sm ${
                                        expandedSerialItems[idx]
                                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold'
                                          : 'bg-[rgb(var(--muted))] text-[rgb(var(--foreground))] hover:bg-emerald-500/10 hover:text-emerald-400 border border-[rgb(var(--border))]'
                                      }`}
                                      title="Xem chi tiết nguồn gốc nhập kho của sản phẩm này"
                                    >
                                      <Truck className="w-3 h-3 text-emerald-400" />
                                      <span>
                                        {hasSerials
                                          ? `Nguồn gốc nhập (${itemSerials.length} Serial)`
                                          : hasOrigins
                                          ? `Nguồn gốc nhập (${origins.length > 1 ? `${origins.length} đơn` : origins[0]?.purchaseCode || 'Phiếu nhập'})`
                                          : 'Nguồn gốc nhập'}
                                      </span>
                                      {expandedSerialItems[idx] ? (
                                        <ChevronUp className="w-3 h-3 text-emerald-400" />
                                      ) : (
                                        <ChevronDown className="w-3 h-3 text-[rgb(var(--muted-foreground))]" />
                                      )}
                                    </button>
                                  );
                                })()}
                              </div>

                              {/* Exchanged Target Item Details Sub-Row */}
                              {item.itemStatus === 'EXCHANGED' && item.exchangedToItem && (
                                <div className="mt-1.5 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300 flex items-center gap-2">
                                  <span>↓ Đổi sang:</span>
                                  <strong className="text-white">{item.exchangedToItem.productName}</strong>
                                  {item.exchangedToItem.serialNumber && (
                                    <span className="font-mono text-[10px] text-purple-400">
                                      (S/N: {item.exchangedToItem.serialNumber})
                                    </span>
                                  )}
                                  <span>• Giá: {formatCurrency(item.exchangedToItem.unitPrice)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-teal-500/10 text-teal-600 border border-teal-500/20">
                            {item.warranty}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-center font-bold">{item.quantity}</td>
                        <td className="px-4 py-3 text-right font-bold text-[rgb(var(--foreground))]">{formatCurrency(item.total)}</td>
                      </tr>

                      {/* Accordion Sub-Row: Purchase Origin Details of Selected Serials / Batches */}
                      {expandedSerialItems[idx] && (
                        <tr className="bg-[rgb(var(--muted))]/20 border-b border-[rgb(var(--border))]">
                          <td colSpan={6} className="p-3 pl-6 sm:pl-12">
                            <div className="p-3.5 rounded-xl bg-[rgb(var(--card))] border border-emerald-500/20 shadow-sm space-y-2.5">
                              {(() => {
                                const origins = itemOriginsMap[idx] || [];

                                return (
                                  <>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                                      <div className="flex items-center gap-2 font-bold text-emerald-500">
                                        <Truck className="w-4 h-4" />
                                        <span>
                                          Thông Tin Nguồn Gốc Nhập Kho (
                                          {itemSerials.length > 0
                                            ? `${itemSerials.length} Serial`
                                            : origins.length > 0
                                            ? `${origins.length} Đơn vị / Đợt nhập`
                                            : 'Sản phẩm không dùng S/N'}
                                          ):
                                        </span>
                                      </div>
                                      <span className="text-[11px] text-[rgb(var(--muted-foreground))]">
                                        Click vào <strong className="text-blue-400 font-mono">Mã Nhập Kho</strong> để nhảy ra phiếu nhập kho đó
                                      </span>
                                    </div>

                                    {origins.length === 0 ? (
                                      <div className="p-4 text-center text-xs text-[rgb(var(--muted-foreground))] bg-[rgb(var(--muted))/30] rounded-xl">
                                        Đang tra cứu dữ liệu nguồn gốc nhập kho của sản phẩm này...
                                      </div>
                                    ) : (
                                      <div className="overflow-x-auto rounded-lg border border-[rgb(var(--border))]">
                                        <table className="w-full text-left text-xs">
                                          <thead className="bg-[rgb(var(--muted))]/60 text-[10px] uppercase font-semibold text-[rgb(var(--muted-foreground))] border-b border-[rgb(var(--border))]">
                                            <tr>
                                              <th className="px-3 py-2">Mã Nhập Kho</th>
                                              <th className="px-3 py-2">Serial Number</th>
                                              <th className="px-3 py-2">Nhà Cung Cấp</th>
                                              <th className="px-3 py-2">Ngày Nhập</th>
                                              <th className="px-3 py-2 text-right">Giá Nhập</th>
                                              <th className="px-3 py-2 text-right">Giá Niêm Yết</th>
                                              <th className="px-3 py-2">Tình Trạng</th>
                                              <th className="px-3 py-2">Bảo Hành NCC</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-[rgb(var(--border))]">
                                            {origins.map((orig: any, origIdx: number) => {
                                              return (
                                                <tr key={origIdx} className="hover:bg-[rgb(var(--accent))]/30 transition-colors">
                                                  <td className="px-3 py-2">
                                                    {orig.purchaseCode && orig.purchaseCode !== 'PNK (Chưa gán)' ? (
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          navigate(
                                                            `/purchases?search=${encodeURIComponent(
                                                              orig.purchaseCode || ''
                                                            )}`
                                                          )
                                                        }
                                                        className="font-mono font-bold text-xs text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1.5 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20 group transition-all"
                                                        title="Click để nhảy ra phiếu nhập kho này"
                                                      >
                                                        <Truck className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
                                                        <span>{orig.purchaseCode}</span>
                                                        <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                                      </button>
                                                    ) : (
                                                      <span className="text-[rgb(var(--muted-foreground))] italic text-[11px]">—</span>
                                                    )}
                                                  </td>
                                                  <td className="px-3 py-2 font-mono font-bold text-emerald-400">
                                                    {orig.serialNumber || '— (Không có S/N)'}
                                                  </td>
                                                  <td className="px-3 py-2 text-[rgb(var(--foreground))]">
                                                    {orig.supplierName || 'NCC N/A'}
                                                  </td>
                                                  <td className="px-3 py-2 text-[rgb(var(--muted-foreground))]">
                                                    {formatDate(orig.purchaseDate)}
                                                  </td>
                                                  <td className="px-3 py-2 text-right font-semibold text-[rgb(var(--foreground))]">
                                                    {formatCurrency(orig.purchasePrice || 0)}
                                                  </td>
                                                  <td className="px-3 py-2 text-right font-medium text-emerald-500">
                                                    {formatCurrency(orig.listPrice || 0)}
                                                  </td>
                                                  <td className="px-3 py-2">
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                      {orig.condition || 'New'}
                                                    </span>
                                                  </td>
                                                  <td className="px-3 py-2">
                                                    <div>{orig.supplierWarrantyMonths || 0} tháng</div>
                                                    {orig.remainingWarrantyDays !== undefined && (
                                                      <div className="mt-0.5">
                                                        <span
                                                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                                            orig.remainingWarrantyDays <= 0
                                                              ? 'bg-red-500/10 text-red-500'
                                                              : orig.remainingWarrantyDays <= 30
                                                              ? 'bg-amber-500/10 text-amber-500'
                                                              : 'bg-emerald-500/10 text-emerald-500'
                                                          }`}
                                                        >
                                                          {orig.remainingWarrantyDays <= 0
                                                            ? 'Hết BH'
                                                            : `Còn ${orig.remainingWarrantyDays}d`}
                                                        </span>
                                                      </div>
                                                    )}
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Calculation Summary */}
        <div className="flex justify-end pt-4 border-t border-[rgb(var(--border))]">
          <div className="w-80 space-y-2 text-xs">
            <div className="flex justify-between text-[rgb(var(--muted-foreground))]">
              <span>Tạm tính:</span>
              <span className="font-semibold text-[rgb(var(--foreground))]">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Chiết khấu:</span>
                <span>-{formatCurrency(invoice.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold pt-2 border-t border-[rgb(var(--border))]">
              <span>TỔNG CỘNG:</span>
              <span className="text-blue-500 text-base">{formatCurrency(invoice.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-emerald-500 font-bold">
              <span>Đã thanh toán:</span>
              <span>-{formatCurrency(invoice.totalPaid)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-amber-500 pt-1 border-t border-[rgb(var(--border))]">
              <span>CÒN NỢ:</span>
              <span>{formatCurrency(invoice.remainingAmount)}</span>
            </div>

            {invoice.isFinalized && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1 mt-3">
                <div className="flex justify-between text-[11px] text-[rgb(var(--muted-foreground))]">
                  <span>Giá vốn linh kiện đã xuất kho:</span>
                  <span className="font-semibold text-[rgb(var(--foreground))]">{formatCurrency(invoice.totalCost || 0)}</span>
                </div>
                <div className={`flex justify-between text-xs font-bold pt-1 border-t border-emerald-500/20 ${(invoice.profit || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  <span>Lợi Nhuận Gộp Đơn Hàng:</span>
                  <span>{(invoice.profit || 0) > 0 ? `+${formatCurrency(invoice.profit || 0)}` : formatCurrency(invoice.profit || 0)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LỊCH SỬ TRẢ / ĐỔI HÀNG SECTION */}
      {returnHistory.length > 0 && (
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[rgb(var(--border))] pb-4">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold">LỊCH SỬ TRẢ / ĐỔI HÀNG ({returnHistory.length})</h2>
            </div>
            <span className="text-xs text-[rgb(var(--muted-foreground))] font-mono">
              Tổng số giao dịch: {returnHistory.length}
            </span>
          </div>

          <div className="space-y-4">
            {returnHistory.map((tx) => {
              const isReturn = tx.type === 'RETURN';

              return (
                <div
                  key={tx._id}
                  className={cn(
                    'p-4 rounded-xl border space-y-3 transition-all',
                    isReturn ? 'border-amber-500/30 bg-amber-500/5' : 'border-purple-500/30 bg-purple-500/5'
                  )}
                >
                  {/* Tx Header */}
                  <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[rgb(var(--border))] pb-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase',
                          isReturn ? 'bg-amber-500/20 text-amber-500' : 'bg-purple-500/20 text-purple-400'
                        )}
                      >
                        {isReturn ? 'TRẢ HÀNG' : 'ĐỔI HÀNG'}
                      </span>
                      <span className="font-mono font-bold text-blue-400">{tx.transactionCode}</span>
                    </div>
                    <span className="text-[rgb(var(--muted-foreground))]">{formatDate(tx.createdAt || new Date())}</span>
                  </div>

                  {/* Item List */}
                  {isReturn ? (
                    <div className="space-y-2 text-xs">
                      {(tx.returnedItems || []).map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-[rgb(var(--card))] border border-[rgb(var(--border))]">
                          <div>
                            <p className="font-bold">{item.productName}</p>
                            <p className="text-[10px] text-[rgb(var(--muted-foreground))]">
                              Mã: {item.productCode} {item.serialNumber ? `• S/N: ${item.serialNumber}` : ''} • Tình trạng: <strong className="text-amber-400">{item.condition}</strong>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-[rgb(var(--foreground))]">Giá bán: {formatCurrency(item.originalSalePrice)}</p>
                            <p className="text-[10px] text-emerald-500">Hoàn tiền: -{formatCurrency(item.refundAmount)}</p>
                            {item.debtReduction > 0 && <p className="text-[10px] text-amber-500">Giảm nợ: -{formatCurrency(item.debtReduction)}</p>}
                            <p className="text-[10px] text-blue-400 font-bold">Giữ lại: +{formatCurrency(item.retainedAmount)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      {(tx.exchangedItems || []).map((item: any, i: number) => (
                        <div key={i} className="p-3 rounded-lg bg-[rgb(var(--card))] border border-[rgb(var(--border))] space-y-2">

                          <div className="flex items-center justify-between text-red-400">
                            <span>Sản phẩm cũ trả: <strong>{item.oldProductName}</strong> ({item.oldProductCode}) {item.oldSerialNumber ? `• S/N: ${item.oldSerialNumber}` : ''}</span>
                            <span className="font-bold">{formatCurrency(item.oldSalePrice)}</span>
                          </div>
                          <div className="flex items-center justify-between text-purple-400 pl-4 border-l-2 border-purple-500">
                            <span>↓ Đổi sang: <strong>{item.newProductName}</strong> ({item.newProductCode}) {item.newSerialNumber ? `• S/N: ${item.newSerialNumber}` : ''}</span>
                            <span className="font-bold">{formatCurrency(item.newSalePrice)}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-[rgb(var(--muted-foreground))] border-t border-[rgb(var(--border))] pt-1">
                            <span>Khách bù thêm: <strong className="text-emerald-500">{formatCurrency(item.customerPaidExtra)}</strong></span>
                            <span>Cộng vào nợ: <strong className="text-amber-500">{formatCurrency(item.customerDebtAdded)}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reason & Notes */}
                  {tx.reason && (
                    <div className="text-xs text-[rgb(var(--muted-foreground))] italic pt-1">
                      Lý do: {tx.reason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Return Exchange Modal */}
      {showReturnExchangeModal && (
        <ReturnExchangeModal
          invoice={invoice}
          onClose={() => setShowReturnExchangeModal(false)}
          onSuccess={() => {
            setShowReturnExchangeModal(false);
            fetchInvoice();
          }}
        />
      )}

      {/* Serial Selection Modal */}
      {activeItemIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[rgb(var(--border))] bg-[rgb(var(--muted))/30]">
              <div>
                <h3 className="font-bold text-base text-[rgb(var(--foreground))]">
                  Chọn Serial Cho: {invoice.items[activeItemIndex]?.productSnapshot?.name}
                </h3>
                <p className="text-xs text-[rgb(var(--muted-foreground))] mt-0.5">
                  Số lượng cần chọn: <strong className="text-blue-500">{invoice.items[activeItemIndex]?.quantity}</strong> Serial
                </p>
              </div>
              <button onClick={() => setActiveItemIndex(null)} className="p-1 text-[rgb(var(--muted-foreground))]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {loadingSerials ? (
                <div className="p-8 text-center text-xs text-[rgb(var(--muted-foreground))]">
                  Đang tải danh sách Serial khả dụng từ kho...
                </div>
              ) : availableSerials.filter((u) => Boolean(u.serialNumber)).length === 0 ? (
                <div className="space-y-3">
                  <div className="p-4 space-y-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <div className="text-xs text-blue-400 font-bold flex items-center gap-1.5">
                      <Truck className="w-4 h-4" />
                      <span>Sản phẩm quản lý theo số lượng (Không dùng Serial riêng)</span>
                    </div>
                    <p className="text-[11px] text-[rgb(var(--muted-foreground))] leading-relaxed">
                      Sản phẩm này nhập kho không theo từng Serial. Khi bấm <strong>CHỐT HÓA ĐƠN</strong>, hệ thống sẽ tự động trừ số lượng tồn kho khả dụng và liên kết nguồn nhập từ các phiếu nhập kho dưới đây:
                    </p>
                  </div>

                  {availableSerials.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-[rgb(var(--foreground))]">
                        Các đợt nhập kho khả dụng trong hệ thống ({availableSerials.length} đơn vị tồn):
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {availableSerials.map((u, i) => (
                          <div
                            key={u._id || i}
                            className="p-2.5 rounded-lg bg-[rgb(var(--background))] border border-[rgb(var(--border))] flex items-center justify-between text-xs hover:border-blue-500/50 transition-all"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-blue-400">{u.purchaseCode || 'PNK'}</span>
                                <span className="text-[rgb(var(--foreground))] font-semibold">
                                  NCC: {u.supplierName || 'N/A'}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">
                                  {u.condition || 'New'}
                                </span>
                              </div>
                              <div className="text-[10px] text-[rgb(var(--muted-foreground))] mt-0.5">
                                Ngày nhập: {formatDate(u.purchaseDate)} • Giá vốn: {formatCurrency(u.purchasePrice || 0)} • BH NCC: {u.supplierWarrantyMonths || 0} tháng
                              </div>
                            </div>
                            {u.purchaseCode && (
                              <button
                                type="button"
                                onClick={() => navigate(`/purchases?search=${encodeURIComponent(u.purchaseCode || '')}`)}
                                className="px-2 py-1 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 inline-flex items-center gap-1"
                              >
                                <span>Xem phiếu</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 text-center text-xs text-[rgb(var(--muted-foreground))] italic bg-[rgb(var(--muted))/20] rounded-lg">
                      Không tìm thấy tồn kho khả dụng từ phiếu nhập cho sản phẩm này.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-[rgb(var(--muted-foreground))] mb-2 flex items-center justify-between">
                    <span>Click vào Serial để chọn (Đã chọn: {selectedSerials.length}/{invoice.items[activeItemIndex!]?.quantity}):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availableSerials.map((u) => {
                      const isSelected = selectedSerials.includes(u.serialNumber);

                      return (
                        <div
                          key={u._id}
                          onClick={() => toggleSerialSelection(u.serialNumber, invoice.items[activeItemIndex!].quantity)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-500/10 border-blue-500 text-blue-500 font-bold shadow-sm'
                              : 'bg-[rgb(var(--background))] border-[rgb(var(--border))] hover:border-blue-500'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-sm">{u.serialNumber}</span>
                            {isSelected && <Check className="w-4 h-4 text-blue-500" />}
                          </div>
                          <div className="text-[11px] text-[rgb(var(--muted-foreground))] mt-1 flex justify-between">
                            <span>NCC: {u.supplierName || 'N/A'}</span>
                            <span>BH NCC: {u.remainingWarrantyDays || 0}d</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-[rgb(var(--border))] bg-[rgb(var(--muted))/20]">
              <button
                type="button"
                onClick={() => setActiveItemIndex(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[rgb(var(--muted-foreground))]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveSerials}
                disabled={savingSerials}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                {savingSerials ? 'Đang lưu...' : 'Xác Nhận Chọn Serial'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finalize Invoice Modal */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[rgb(var(--border))] bg-[rgb(var(--muted))/30]">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-base text-[rgb(var(--foreground))]">
                  Xác Nhận CHỐT HÓA ĐƠN (Trừ Kho)
                </h3>
              </div>
              <button onClick={() => setShowFinalizeModal(false)} className="p-1 text-[rgb(var(--muted-foreground))]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFinalizeInvoice} className="p-6 space-y-4">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 space-y-1">
                <div className="font-bold">Mã hóa đơn: {invoice.invoiceCode}</div>
                <div>Tổng giá trị: {formatCurrency(invoice.grandTotal)}</div>
                <div className="pt-1 text-[11px] text-[rgb(var(--muted-foreground))]">
                  Khi chốt hóa đơn, toàn bộ Serial đã chọn sẽ được chuyển sang trạng thái <strong>SOLD</strong> và officially trừ tồn kho.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                  Số Tiền Khách Đã Trả (₫)
                </label>
                <input
                  type="number"
                  min={0}
                  max={invoice.grandTotal}
                  value={finalizePaid}
                  onChange={(e) => setFinalizePaid(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-emerald-500"
                />
              </div>

              {invoice.grandTotal - finalizePaid > 0 && (
                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
                  <div className="text-xs font-bold text-amber-500">
                    Khách còn nợ: {formatCurrency(invoice.grandTotal - finalizePaid)}
                  </div>
                  <label className="block text-xs font-semibold text-[rgb(var(--foreground))]">
                    Hạn Thanh Toán Công Nợ Khách Hàng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={finalizeDueDate}
                    onChange={(e) => setFinalizeDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgb(var(--border))]">
                <button
                  type="button"
                  onClick={() => setShowFinalizeModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[rgb(var(--muted-foreground))]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingFinalize}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {submittingFinalize ? 'Đang chốt...' : 'CHỐT HÓA ĐƠN NGAY'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <RecordPaymentModal
          invoice={invoice}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            fetchInvoice();
          }}
        />
      )}
    </div>
  );
}

// Modal Ghi Nhận Thanh Toán (Same helper)
function RecordPaymentModal({
  invoice,
  onClose,
  onSuccess,
}: {
  invoice: Invoice;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState(invoice.remainingAmount);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.BANK_TRANSFER);
  const [bankName, setBankName] = useState('MB Bank');
  const [referenceCode, setReferenceCode] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/invoices/${invoice._id}/payments`, {
        amount: Number(amount),
        paymentMethod,
        bankName: paymentMethod === PaymentMethod.BANK_TRANSFER ? bankName : undefined,
        referenceCode: referenceCode.trim() || undefined,
        notes: notes.trim() || undefined,
        createdBy: 'Admin',
      });
      toast.success('Đã ghi nhận thanh toán!');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể lưu lượt thanh toán');
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
            <h2 className="text-base font-bold">Ghi Nhận Thanh Toán Hóa Đơn</h2>
          </div>
          <button type="button" onClick={onClose}>
            <X className="w-5 h-5 text-[rgb(var(--muted-foreground))]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 flex justify-between">
            <span>Số tiền còn nợ:</span>
            <strong className="text-sm font-extrabold">{formatCurrency(invoice.remainingAmount)}</strong>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Số tiền thu đợt này (VNĐ) *</label>
            <input
              type="number"
              min={1000}
              max={invoice.remainingAmount}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className={cn(inputClass, 'text-base font-bold text-emerald-500')}
              placeholder="VD: 5000000"
            />
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setAmount(invoice.remainingAmount)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
              >
                Trả hết ({formatCurrency(invoice.remainingAmount)})
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
              <label className="text-sm font-medium mb-1.5 block font-medium">Tên Ngân hàng</label>
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
            <label className="text-sm font-medium mb-1.5 block">Mã giao dịch / Mã tham chiếu (Nếu có)</label>
            <input
              type="text"
              value={referenceCode}
              onChange={(e) => setReferenceCode(e.target.value)}
              className={inputClass}
              placeholder="VD: FT2620984012"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Ghi chú lượt thanh toán</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass}
              placeholder="VD: Khách chuyển cọc đợt 1..."
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
              Xác Nhận Thu Tiền
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
