import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { cn, formatCurrency, formatDate, invoiceStatusColors } from '@/lib/utils';
import { InvoiceStatus, PaymentMethod } from '@/types';
import type { Invoice, InvoiceItem, InventoryUnitRecord } from '@/types';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Printer, Download, CreditCard, Plus, FileText,
  User, Calendar, DollarSign, Package, CheckCircle2, Clock,
  AlertCircle, ShieldCheck, X, Loader2, Save, Trash2, Tag, ExternalLink,
  Check, Lock, CheckSquare,
} from 'lucide-react';

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

  // Finalize Invoice State
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizePaid, setFinalizePaid] = useState<number>(0);
  const [finalizeDueDate, setFinalizeDueDate] = useState<string>('');
  const [submittingFinalize, setSubmittingFinalize] = useState(false);

  // Payment Record Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get(`/invoices/${id}`);
      setInvoice(res.data.data);
      setFinalizePaid(res.data.data.totalPaid || 0);
      if (res.data.data.dueDate) {
        setFinalizeDueDate(new Date(res.data.data.dueDate).toISOString().split('T')[0]);
      }
    } catch {
      toast.error('Không thể tải thông tin hóa đơn');
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

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
        // Show units that are AVAILABLE or RESERVED by this invoice
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
    window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/pdf/invoices/${invoice._id}`, '_blank');
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
                  ĐÃ CHỐT HÓA ĐƠN (ĐÃ TRỪ KHO)
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

        {/* Product Items Table with Serial Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[rgb(var(--foreground))]">
              Danh Sách Sản Phẩm / Serial Hóa Đơn ({invoice.items.length})
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
                  <th className="px-4 py-2.5">Serial Được Chọn</th>
                  <th className="px-4 py-2.5 text-right">Thành Tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--border))]">
                {invoice.items.map((item, idx) => {
                  const selectedCount = (item.selectedSerials || []).length;
                  const isFullySelected = selectedCount === item.quantity;

                  return (
                    <tr key={idx} className="hover:bg-[rgb(var(--accent))]/50">
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
                            <p className="font-semibold text-sm">{item.productSnapshot.name}</p>
                            <span className="font-mono text-[11px] text-blue-500">{item.productSnapshot.productCode}</span>
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
                      <td className="px-4 py-3">
                        {isDraft ? (
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => handleOpenSerialModal(idx)}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                                isFullySelected
                                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/20'
                              }`}
                            >
                              <span>
                                {isFullySelected ? `✓ Đã chọn ${selectedCount}/${item.quantity} Serial` : `Chọn Serial (${selectedCount}/${item.quantity})`}
                              </span>
                            </button>
                            {item.selectedSerials && item.selectedSerials.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.selectedSerials.map((s) => (
                                  <span key={s} className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-semibold border border-blue-500/20">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {item.selectedSerials && item.selectedSerials.length > 0 ? (
                              item.selectedSerials.map((s) => (
                                <span key={s} className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">
                                  S/N: {s}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-[rgb(var(--muted-foreground))] italic">Không gắn Serial</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[rgb(var(--foreground))]">{formatCurrency(item.total)}</td>
                    </tr>
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
                <div className="flex justify-between text-xs font-bold text-emerald-500 pt-1 border-t border-emerald-500/20">
                  <span>Lợi Nhuận Gộp Đơn Hàng:</span>
                  <span>+{formatCurrency(invoice.profit || (invoice.grandTotal - (invoice.totalCost || 0)))}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
              ) : availableSerials.length === 0 ? (
                <div className="p-8 text-center space-y-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <div className="text-xs text-amber-500 font-semibold">
                    ⚠️ Không có Serial khả dụng cho sản phẩm này trong kho (Tình trạng yêu cầu: <strong>{invoice.items[activeItemIndex!]?.productSnapshot?.condition || 'Mới'}</strong>).
                  </div>
                  <p className="text-[11px] text-[rgb(var(--muted-foreground))]">
                    Vui lòng tiến hành Nhập Hàng từ Nhà cung cấp để cập nhật dải Serial vào kho.
                  </p>
                  <a
                    href="/purchases/new"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-500/20"
                  >
                    + Nhập Hàng Ngay
                  </a>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-[rgb(var(--muted-foreground))] mb-2 flex items-center justify-between">
                    <span>Click vào Serial để chọn (Đã chọn: {selectedSerials.length}/{invoice.items[activeItemIndex!]?.quantity}):</span>
                    <span className="text-[11px] font-semibold text-blue-500">
                      Tình trạng cần chọn: {invoice.items[activeItemIndex!]?.productSnapshot?.condition || 'Mới'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availableSerials.map((u) => {
                      const isSelected = selectedSerials.includes(u.serialNumber);
                      const targetCond = invoice.items[activeItemIndex!]?.productSnapshot?.condition;
                      const isCondMatch = !targetCond || u.condition === targetCond;

                      return (
                        <div
                          key={u._id}
                          onClick={() => toggleSerialSelection(u.serialNumber, invoice.items[activeItemIndex!].quantity)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-500/10 border-blue-500 text-blue-500 font-bold shadow-sm'
                              : isCondMatch
                              ? 'bg-[rgb(var(--background))] border-emerald-500/40 hover:border-emerald-500'
                              : 'bg-[rgb(var(--background))] border-[rgb(var(--border))] opacity-75 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-sm">{u.serialNumber}</span>
                            {isSelected ? (
                              <Check className="w-4 h-4 text-blue-500" />
                            ) : isCondMatch ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">
                                Khớp tình trạng
                              </span>
                            ) : null}
                          </div>
                          <div className="text-[11px] text-[rgb(var(--muted-foreground))] mt-1 flex justify-between">
                            <span className="font-semibold">Tình trạng: <strong className={isCondMatch ? 'text-emerald-500' : ''}>{u.condition}</strong></span>
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
