import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn, formatCurrency, debounce, buildSpecsString, conditionColors } from '@/lib/utils';
import { QuoteStatus, DiscountType, WARRANTY_OPTIONS } from '@/types';
import type { Quote, InventoryItem } from '@/types';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Save, Plus, Search, Package, Trash2,
  Loader2, Download, X, Warehouse, Receipt,
} from 'lucide-react';

const customerSchema = z.object({
  name: z.string().min(1, 'Tên khách hàng là bắt buộc'),
  phone: z.string().optional(),
  email: z.string().email('Email không hợp lệ').or(z.literal('')).optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export function QuoteForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Financials
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<DiscountType>(DiscountType.FIXED);
  const [shippingFee, setShippingFee] = useState(0);
  const [vatEnabled, setVatEnabled] = useState(false);
  const [vatPercent, setVatPercent] = useState(10);

  const {
    register, handleSubmit, reset, setValue, watch, formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
  });

  const [showConditionInPdf, setShowConditionInPdf] = useState(false);

  // Customer Autocomplete Search
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const nameValue = watch('name');
  const phoneValue = watch('phone');

  useEffect(() => {
    const term = (nameValue || phoneValue || '').trim();
    if (!term || term.length < 2) {
      setCustomerSuggestions([]);
      setShowCustomerDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/customers', { params: { search: term, limit: 5 } });
        if (res.data.success && res.data.data.length > 0) {
          setCustomerSuggestions(res.data.data);
          setShowCustomerDropdown(true);
        } else {
          setCustomerSuggestions([]);
          setShowCustomerDropdown(false);
        }
      } catch (err) {
        console.error(err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [nameValue, phoneValue]);

  useEffect(() => {
    if (isEdit) fetchQuote();
  }, [id]);

  const fetchQuote = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/quotes/${id}`);
      const q = res.data.data;
      setQuote(q);
      reset({
        name: q.customer.name,
        phone: q.customer.phone,
        email: q.customer.email,
        address: q.customer.address,
        notes: q.customer.notes,
      });
      setDiscount(q.discount);
      setDiscountType(q.discountType);
      setShippingFee(q.shippingFee);
      setVatEnabled(q.vatEnabled);
      setVatPercent(q.vatPercent);
      setShowConditionInPdf(!!q.showConditionInPdf);
    } catch {
      toast.error('Không thể tải báo giá');
      navigate('/quotes');
    } finally {
      setLoading(false);
    }
  };

  const onSubmitCustomer = async (data: CustomerFormData) => {
    setSaving(true);
    try {
      if (isEdit) {
        const res = await api.put(`/quotes/${id}`, {
          customer: data,
          discount,
          discountType,
          shippingFee,
          vatEnabled,
          vatPercent,
          showConditionInPdf,
        });
        setQuote(res.data.data);
        toast.success('Đã cập nhật báo giá');
      } else {
        const res = await api.post('/quotes', {
          customer: data,
          showConditionInPdf,
        });
        toast.success('Đã tạo báo giá');
        navigate(`/quotes/${res.data.data._id}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: QuoteStatus) => {
    if (!quote) return;
    try {
      const res = await api.patch(`/quotes/${quote._id}/status`, { status: newStatus });
      setQuote(res.data.data);
      if (newStatus === QuoteStatus.CONFIRMED) {
        toast.success('Đã chốt đơn & tự động xuất kho trừ số lượng tồn!');
      } else {
        toast.success(`Đã đổi trạng thái thành ${newStatus}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể đổi trạng thái');
    }
  };

  const addInventoryItemToQuote = async (
    inventoryItemId: string,
    unitPrice: number,
    warranty: string,
    serialNumber?: string,
    condition?: string
  ) => {
    if (!quote) return;
    try {
      const res = await api.post(`/quotes/${quote._id}/products`, {
        inventoryItem: inventoryItemId,
        unitPrice,
        quantity: 1,
        warranty,
        serialNumber,
        condition,
      });
      setQuote(res.data.data);
      toast.success('Đã thêm linh kiện vào báo giá');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể thêm linh kiện');
    }
  };

  const removeItem = async (itemId: string) => {
    if (!quote) return;
    try {
      const res = await api.delete(`/quotes/${quote._id}/items/${itemId}`);
      setQuote(res.data.data);
      toast.success('Đã xóa linh kiện');
    } catch {
      toast.error('Không thể xóa');
    }
  };

  const updateItem = async (itemId: string, data: { unitPrice?: number; quantity?: number; discount?: number; warranty?: string }) => {
    if (!quote) return;
    try {
      const res = await api.patch(`/quotes/${quote._id}/items/${itemId}`, data);
      setQuote(res.data.data);
    } catch {
      toast.error('Không thể cập nhật');
    }
  };

  const updateFinancials = async (overrideShowCondition?: boolean | any) => {
    if (!quote) return;
    const isBool = typeof overrideShowCondition === 'boolean';
    const targetShowCondition = isBool ? overrideShowCondition : showConditionInPdf;
    try {
      const res = await api.put(`/quotes/${quote._id}`, {
        discount,
        discountType,
        shippingFee,
        vatEnabled,
        vatPercent,
        showConditionInPdf: targetShowCondition,
      });
      setQuote(res.data.data);
    } catch {
      toast.error('Lỗi cập nhật');
    }
  };

  const handleCreateInvoice = async () => {
    if (!quote) return;
    try {
      const res = await api.post(`/invoices/from-quote/${quote._id}`);
      toast.success('Đã tạo hóa đơn bán hàng thành công!');
      navigate(`/invoices/${res.data.data._id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể tạo hóa đơn');
    }
  };

  const downloadPdf = async () => {
    if (!quote) return;
    setDownloading(true);
    try {
      const res = await api.get(`/pdf/quotes/${quote._id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${quote.quoteCode}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Đã tải PDF');
    } catch {
      toast.error('Không thể tải PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const inputClass = cn(
    'w-full px-4 py-2.5 rounded-xl text-sm',
    'bg-[rgb(var(--muted))] border border-[rgb(var(--border))]',
    'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50',
    'transition-smooth'
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button
          onClick={() => navigate('/quotes')}
          className="flex items-center gap-2 text-sm text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] font-medium transition-smooth"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại Danh sách Báo Giá
        </button>

        {isEdit && quote && (
          <div className="flex items-center gap-3 flex-wrap">
            {quote.status === QuoteStatus.CONFIRMED && (
              quote.invoiceId ? (
                <Link
                  to={`/invoices/${quote.invoiceId}`}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 text-xs font-bold hover:bg-emerald-500/20 border border-emerald-500/30 transition-smooth"
                >
                  <Receipt className="w-4 h-4" />
                  Xem Hóa Đơn ({quote.invoiceCode})
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateInvoice}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold hover:opacity-90 transition-smooth shadow-md shadow-emerald-500/20"
                >
                  <Receipt className="w-4 h-4" />
                  Tạo Hóa Đơn Bán Hàng
                </button>
              )
            )}

            <select
              value={quote.status}
              onChange={(e) => handleStatusChange(e.target.value as QuoteStatus)}
              className={cn(
                'px-3 py-2 rounded-xl text-xs font-semibold border transition-smooth cursor-pointer',
                quote.status === QuoteStatus.CONFIRMED ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' :
                quote.status === QuoteStatus.SENT ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' :
                quote.status === QuoteStatus.CANCELLED ? 'bg-red-500/10 text-red-500 border-red-500/30' :
                'bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))] border-[rgb(var(--border))]'
              )}
            >
              {Object.values(QuoteStatus).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <button
              onClick={downloadPdf}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[rgb(var(--border))] text-xs font-medium hover:bg-[rgb(var(--accent))] transition-smooth"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Xuất PDF
            </button>
          </div>
        )}

        <button
          onClick={handleSubmit(onSubmitCustomer)}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-medium hover:opacity-90 transition-smooth disabled:opacity-50 shadow-lg shadow-blue-500/25"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Lưu
        </button>
      </div>

      {/* Customer Info */}
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 relative">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Thông tin khách hàng</h2>
          <span className="text-xs text-blue-500 font-medium">
            💡 Nhập tên/SĐT để sổ danh sách khách hàng cũ hoặc nhập tự do (tự động tạo hồ sơ CRM)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <label className="text-sm font-medium mb-1.5 block">Tên khách hàng *</label>
            <input {...register('name')} className={inputClass} placeholder="Tên khách hàng..." autoComplete="off" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}

            {/* Customer Suggestions Dropdown */}
            {showCustomerDropdown && customerSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-[rgb(var(--card))] border border-blue-500/40 rounded-xl shadow-2xl overflow-hidden divide-y divide-[rgb(var(--border))] animate-fade-in">
                <div className="px-3 py-1.5 bg-blue-500/10 text-blue-500 text-[11px] font-bold uppercase tracking-wider flex items-center justify-between">
                  <span>Khách hàng trùng khớp trong hệ thống (Click để chọn):</span>
                  <button type="button" onClick={() => setShowCustomerDropdown(false)}>
                    <X className="w-3.5 h-3.5 text-[rgb(var(--muted-foreground))]" />
                  </button>
                </div>
                {customerSuggestions.map((c) => (
                  <div
                    key={c._id}
                    onClick={() => {
                      setValue('name', c.name);
                      if (c.phone) setValue('phone', c.phone);
                      if (c.email) setValue('email', c.email);
                      if (c.address) setValue('address', c.address);
                      if (c.notes) setValue('notes', c.notes);
                      setShowCustomerDropdown(false);
                      toast.success(`Đã chọn khách hàng: ${c.name}`);
                    }}
                    className="p-3 hover:bg-[rgb(var(--accent))] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-xs text-[rgb(var(--foreground))]">{c.name}</div>
                      <span className="font-mono text-[10px] text-blue-500 font-bold">{c.customerCode}</span>
                    </div>
                    <div className="text-[11px] text-[rgb(var(--muted-foreground))] mt-0.5">
                      SĐT: {c.phone || 'Chưa có'} {c.address ? `• ĐC: ${c.address}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Số điện thoại</label>
            <input {...register('phone')} className={inputClass} placeholder="0123.456.789" autoComplete="off" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Email</label>
            <input {...register('email')} className={inputClass} placeholder="email@example.com" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Địa chỉ</label>
            <input {...register('address')} className={inputClass} placeholder="Địa chỉ giao hàng" />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium mb-1.5 block">Ghi chú đơn hàng</label>
            <textarea {...register('notes')} className={cn(inputClass, 'h-20 resize-none')} placeholder="Ghi chú thêm..." />
          </div>

          <div className="md:col-span-2 pt-2">
            <label className="flex items-center gap-3 text-sm text-[rgb(var(--foreground))] cursor-pointer p-3 rounded-xl bg-[rgb(var(--muted))]/50 border border-[rgb(var(--border))] hover:border-blue-500/30 transition-smooth">
              <input
                type="checkbox"
                checked={showConditionInPdf}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setShowConditionInPdf(checked);
                  updateFinancials(checked);
                }}
                className="w-4 h-4 rounded border-[rgb(var(--border))] text-blue-500 focus:ring-blue-500/30"
              />
              <div>
                <span className="font-semibold block text-sm">Hiển thị Tình trạng sản phẩm (New, 99%, Like New...) khi tải/in PDF</span>
                <span className="text-xs text-[rgb(var(--muted-foreground))]">Tích vào nếu muốn file PDF báo giá in thêm nhãn tình trạng linh kiện. Nếu không tích file PDF sẽ ẩn tình trạng.</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Products in Quote */}
      {isEdit && quote && (
        <>
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Danh sách linh kiện trong báo giá ({quote.items.length})</h2>
              <button
                type="button"
                onClick={() => setShowProductSearch(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-500/10 text-blue-500 text-sm font-medium hover:bg-blue-500/20 transition-smooth"
              >
                <Plus className="w-4 h-4" />
                Thêm linh kiện từ kho
              </button>
            </div>

            {quote.items.length === 0 ? (
              <div className="text-center py-12 text-[rgb(var(--muted-foreground))]">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Chưa có linh kiện nào trong báo giá này</p>
                <button
                  type="button"
                  onClick={() => setShowProductSearch(true)}
                  className="mt-2 text-xs text-blue-500 hover:text-blue-400 font-medium"
                >
                  + Thêm linh kiện từ kho
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {quote.items.sort((a, b) => a.order - b.order).map((item) => (
                  <div
                    key={item._id}
                    className="flex items-start gap-4 p-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))]/30 flex-wrap md:flex-nowrap"
                  >
                    <div className="w-14 h-14 rounded-xl bg-[rgb(var(--muted))] overflow-hidden flex-shrink-0">
                      {item.productSnapshot.imageUrl ? (
                        <img src={item.productSnapshot.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 opacity-30" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{item.productSnapshot.name}</p>
                        <span className={cn('px-2 py-0.5 rounded text-[10px] font-semibold', conditionColors[item.productSnapshot.condition] || '')}>
                          {item.productSnapshot.condition}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-blue-500 font-mono">{item.productSnapshot.productCode}</p>
                        {(item.serialNumber || item.productSnapshot.serialNumber) && (
                          <span className="text-[11px] font-semibold font-mono text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            S/N: {item.serialNumber || item.productSnapshot.serialNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[rgb(var(--muted-foreground))] mt-0.5 line-clamp-1">
                        {buildSpecsString(item.productSnapshot.specs as any)}
                      </p>
                      {item.productSnapshot.costPrice > 0 && (
                        <p className="text-[10px] text-[rgb(var(--muted-foreground))] mt-1">
                          Giá vốn nhập: {formatCurrency(item.productSnapshot.costPrice)}
                        </p>
                      )}
                    </div>

                    {/* Pricing, Quantity & Custom Warranty */}
                    <div className="flex items-center gap-3 flex-wrap md:flex-nowrap flex-shrink-0">
                      <div className="text-right">
                        <label className="text-[10px] text-[rgb(var(--muted-foreground))] block">Bảo hành</label>
                        <select
                          value={item.warranty || '12 tháng'}
                          onChange={(e) => updateItem(item._id, { warranty: e.target.value })}
                          className="px-2 py-1 rounded-lg text-xs bg-[rgb(var(--muted))] border border-[rgb(var(--border))] focus:outline-none"
                        >
                          {WARRANTY_OPTIONS.map((w) => (
                            <option key={w} value={w}>{w}</option>
                          ))}
                        </select>
                      </div>

                      <div className="text-right">
                        <label className="text-[10px] text-[rgb(var(--muted-foreground))] block">Giá bán ra</label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item._id, { unitPrice: Number(e.target.value) })}
                          className="w-28 px-2 py-1 rounded-lg text-sm text-right bg-[rgb(var(--muted))] border border-[rgb(var(--border))] focus:outline-none focus:ring-1 focus:ring-blue-500/30 font-bold text-blue-500"
                        />
                      </div>

                      <div className="text-right">
                        <label className="text-[10px] text-[rgb(var(--muted-foreground))] block">SL bán</label>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(item._id, { quantity: Number(e.target.value) })}
                          className="w-16 px-2 py-1 rounded-lg text-sm text-center bg-[rgb(var(--muted))] border border-[rgb(var(--border))] focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                        />
                      </div>

                      <div className="text-right">
                        <label className="text-[10px] text-[rgb(var(--muted-foreground))] block">Giảm</label>
                        <input
                          type="number"
                          min={0}
                          value={item.discount}
                          onChange={(e) => updateItem(item._id, { discount: Number(e.target.value) })}
                          className="w-20 px-2 py-1 rounded-lg text-sm text-right bg-[rgb(var(--muted))] border border-[rgb(var(--border))] focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                        />
                      </div>

                      <div className="text-right w-32">
                        <label className="text-[10px] text-[rgb(var(--muted-foreground))] block">Thành tiền</label>
                        <p className="text-sm font-bold text-blue-500">{formatCurrency(item.total)}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item._id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 transition-smooth"
                      >
                        <Trash2 className="w-4 h-4 text-[rgb(var(--muted-foreground))] hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals & Profit Calculation */}
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
            <h2 className="text-base font-semibold mb-4">Tổng tiền thanh toán</h2>
            <div className="max-w-sm ml-auto space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[rgb(var(--muted-foreground))]">Tạm tính:</span>
                <span className="font-medium">{formatCurrency(quote.subtotal)}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-[rgb(var(--muted-foreground))] flex-shrink-0">Chiết khấu thêm:</span>
                <input
                  type="number"
                  min={0}
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  onBlur={updateFinancials}
                  className="w-24 px-2 py-1 rounded-lg text-sm text-right bg-[rgb(var(--muted))] border border-[rgb(var(--border))] focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                />
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                  onBlur={updateFinancials}
                  className="px-2 py-1 rounded-lg text-sm bg-[rgb(var(--muted))] border border-[rgb(var(--border))]"
                >
                  <option value="fixed">VNĐ</option>
                  <option value="percent">%</option>
                </select>
              </div>

              {(() => {
                const itemsDisc = (quote.items || []).reduce((sum, item) => {
                  const d = item.discountType === DiscountType.PERCENT
                    ? (item.unitPrice * item.quantity * item.discount) / 100
                    : (item.discount || 0);
                  return sum + d;
                }, 0);
                const qDisc = discountType === DiscountType.PERCENT
                  ? ((quote.subtotal - itemsDisc) * discount) / 100
                  : discount;
                const totalDisc = itemsDisc + qDisc;
                if (totalDisc <= 0) return null;
                return (
                  <div className="flex justify-between text-xs text-amber-500 font-medium pt-1">
                    <span>Tổng chiết khấu (SP + đơn):</span>
                    <span>-{formatCurrency(totalDisc)}</span>
                  </div>
                );
              })()}

              <div className="flex items-center gap-2">
                <span className="text-sm text-[rgb(var(--muted-foreground))] flex-shrink-0">Vận chuyển:</span>
                <input
                  type="number"
                  min={0}
                  value={shippingFee}
                  onChange={(e) => setShippingFee(Number(e.target.value))}
                  onBlur={updateFinancials}
                  className="w-28 px-2 py-1 rounded-lg text-sm text-right bg-[rgb(var(--muted))] border border-[rgb(var(--border))] focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-[rgb(var(--muted-foreground))] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vatEnabled}
                    onChange={(e) => setVatEnabled(e.target.checked)}
                    onBlur={updateFinancials}
                    className="rounded"
                  />
                  VAT
                </label>
                {vatEnabled && (
                  <>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={vatPercent}
                      onChange={(e) => setVatPercent(Number(e.target.value))}
                      onBlur={updateFinancials}
                      className="w-16 px-2 py-1 rounded-lg text-sm text-right bg-[rgb(var(--muted))] border border-[rgb(var(--border))]"
                    />
                    <span className="text-sm text-[rgb(var(--muted-foreground))]">%</span>
                    <span className="ml-auto text-sm">{formatCurrency(quote.vatAmount)}</span>
                  </>
                )}
              </div>

              <hr className="border-[rgb(var(--border))]" />

              <div className="flex justify-between items-center">
                <span className="text-base font-bold">Tổng thanh toán:</span>
                <span className="text-xl font-bold text-blue-500">
                  {formatCurrency(quote.grandTotal)}
                </span>
              </div>

            </div>
          </div>
        </>
      )}

      {/* Inventory Search Modal */}
      {showProductSearch && (
        <InventorySearchModal
          onClose={() => setShowProductSearch(false)}
          onSelect={(inventoryItemId, defaultSellingPrice, defaultWarranty, selectedSerial, selectedCondition) => {
            addInventoryItemToQuote(inventoryItemId, defaultSellingPrice, defaultWarranty, selectedSerial, selectedCondition);
            setShowProductSearch(false);
          }}
        />
      )}
    </div>
  );
}

// Popup chọn Lô Linh Kiện từ Kho để đưa vào Báo Giá
function InventorySearchModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (
    inventoryItemId: string,
    sellingPrice: number,
    warranty: string,
    serialNumber?: string,
    condition?: string
  ) => void;
}) {
  const [search, setSearch] = useState('');
  const [lots, setLots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Selected lot for setting selling price & warranty before adding
  const [activeLot, setActiveLot] = useState<any | null>(null);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [warranty, setWarranty] = useState('12 tháng');
  const [selectedSerial, setSelectedSerial] = useState<string>('');

  const fetchLotsList = useCallback(
    debounce(async (query: string) => {
      setLoading(true);
      try {
        const params: Record<string, any> = {};
        if (query.trim()) params.search = query.trim();
        const res = await api.get('/inventory-units/by-condition', { params });
        const variantsList = (res.data.data || []).map((v: any) => ({
          _id: v.productId,
          product: {
            _id: v.productId,
            name: v.productName,
            productCode: v.productCode,
            images: v.imageUrl ? [{ url: v.imageUrl }] : [],
            specs: v.specs,
            sellingPrice: v.suggestedSellingPrice,
          },
          costPrice: v.costPrice,
          condition: v.condition,
          quantity: v.availableStock,
          stockCode: v.productCode,
          suggestedSellingPrice: v.suggestedSellingPrice,
        }));
        setLots(variantsList);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setLoading(false);
      }
    }, 200),
    []
  );

  useEffect(() => {
    fetchLotsList(search);
  }, [search]);

  const handlePickLot = (lot: any) => {
    setActiveLot(lot);
    setSellingPrice(lot.suggestedSellingPrice || lot.costPrice || 0);
    setWarranty('12 tháng');
    setSelectedSerial('');
  };

  const handleConfirmAdd = () => {
    if (!activeLot) return;
    onSelect(activeLot._id, sellingPrice, warranty, selectedSerial || undefined, activeLot.condition);
  };

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className={cn(
        'fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[620px]',
        'rounded-2xl border shadow-2xl z-50 max-h-[80vh] flex flex-col',
        'bg-[rgb(var(--card))] border-[rgb(var(--border))]',
        'animate-scale-in'
      )}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[rgb(var(--border))]">
          <Warehouse className="w-5 h-5 text-blue-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm linh kiện từ kho theo Tên, Mã SP, Serial..."
            className="flex-1 bg-transparent text-sm focus:outline-none"
            autoFocus
          />
          <button type="button" onClick={onClose}>
            <X className="w-5 h-5 text-[rgb(var(--muted-foreground))]" />
          </button>
        </div>

        {/* Lot selection step vs Price/Warranty entry step */}
        {activeLot ? (
          <div className="p-6 space-y-4 overflow-y-auto">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[rgb(var(--muted))]/50 border border-[rgb(var(--border))]">
              <div className="w-12 h-12 rounded-lg bg-[rgb(var(--muted))] overflow-hidden flex-shrink-0">
                {activeLot.product?.images?.[0]?.url ? (
                  <img src={activeLot.product.images[0].url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-5 h-5 opacity-30" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate">{activeLot.product?.name}</p>
                  <span className={cn('px-2 py-0.5 rounded text-[10px] font-semibold', conditionColors[activeLot.condition] || '')}>
                    {activeLot.condition}
                  </span>
                </div>
                <p className="text-xs text-[rgb(var(--muted-foreground))]">
                  Mã: {activeLot.product?.productCode} • Giá vốn: <strong className="text-[rgb(var(--foreground))]">{formatCurrency(activeLot.costPrice)}</strong>
                  {activeLot.supplier && ` • NCC: ${activeLot.supplier}`}
                </p>
              </div>
            </div>

            {/* Serial Number Selection if available */}
            {activeLot.serialNumbers && activeLot.serialNumbers.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Chọn Serial Number của sản phẩm này *</label>
                <select
                  value={selectedSerial}
                  onChange={(e) => setSelectedSerial(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm font-mono bg-[rgb(var(--muted))] border border-[rgb(var(--border))] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  {activeLot.serialNumbers.map((sn: string, idx: number) => (
                    <option key={idx} value={sn}>
                      Serial #{idx + 1}: {sn}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-1.5 block">Nhập Giá Bán Ra (Cho đơn báo giá này) *</label>
              <input
                type="number"
                min={0}
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl text-base font-bold text-blue-500 bg-[rgb(var(--muted))] border border-[rgb(var(--border))] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                placeholder="VD: 3200000"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Chọn Thời Gian Bảo Hành *</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {WARRANTY_OPTIONS.map((w) => (
                  <button
                    type="button"
                    key={w}
                    onClick={() => setWarranty(w)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-medium border transition-smooth',
                      warranty === w
                        ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                        : 'bg-[rgb(var(--muted))] border-[rgb(var(--border))] text-[rgb(var(--muted-foreground))]'
                    )}
                  >
                    {w}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={warranty}
                onChange={(e) => setWarranty(e.target.value)}
                className="w-full px-4 py-2 rounded-xl text-sm bg-[rgb(var(--muted))] border border-[rgb(var(--border))]"
                placeholder="Tự nhập..."
              />
            </div>

            <div className="flex justify-between pt-4 border-t border-[rgb(var(--border))]">
              <button
                type="button"
                onClick={() => setActiveLot(null)}
                className="px-4 py-2 text-sm text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]"
              >
                ← Chọn linh kiện khác
              </button>
              <button
                type="button"
                onClick={handleConfirmAdd}
                className="px-5 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-smooth shadow-lg shadow-blue-500/25"
              >
                Đưa Vào Báo Giá
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : lots.length === 0 ? (
              <div className="text-center py-10 space-y-3 text-[rgb(var(--muted-foreground))]">
                <Package className="w-12 h-12 mx-auto opacity-30 stroke-1" />
                <p className="text-sm font-semibold text-[rgb(var(--foreground))]">
                  Chưa có sản phẩm nào trong Danh Mục hoặc Không tìm thấy linh kiện phù hợp
                </p>
                <p className="text-xs max-w-xs mx-auto">
                  Bạn có thể tạo mã sản phẩm mới trong mục "Mã Sản Phẩm" hoặc tiến hành "Nhập Hàng" từ Nhà cung cấp.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <a
                    href="/products/new"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20"
                  >
                    + Tạo Mã Sản Phẩm Mới
                  </a>
                  <a
                    href="/purchases/new"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20"
                  >
                    + Tạo Phiếu Nhập Hàng
                  </a>
                </div>
              </div>
            ) : (
              lots.map((lot) => (
                <button
                  type="button"
                  key={lot._id}
                  onClick={() => handlePickLot(lot)}
                  className={cn(
                    'flex items-center gap-3 w-full p-3 rounded-xl text-left',
                    'hover:bg-[rgb(var(--accent))] transition-smooth'
                  )}
                >
                  <div className="w-12 h-12 rounded-lg bg-[rgb(var(--muted))] overflow-hidden flex-shrink-0">
                    {lot.product?.images?.[0]?.url ? (
                      <img src={lot.product.images[0].url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-5 h-5 opacity-30" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{lot.product?.name}</p>
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-semibold', conditionColors[lot.condition] || '')}>
                        {lot.condition}
                      </span>
                    </div>
                    <p className="text-xs text-[rgb(var(--muted-foreground))] mt-0.5">
                      Mã: {lot.product?.productCode} • Mã kho: {lot.stockCode}
                      {lot.supplier ? ` • NCC: ${lot.supplier}` : ''}
                    </p>
                    {(lot.serialNumber || (lot.serialNumbers && lot.serialNumbers.length > 0)) && (
                      <p className="text-[11px] text-emerald-500 font-mono mt-0.5 font-semibold">
                        S/N: {lot.serialNumber || lot.serialNumbers.join(', ')}
                      </p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-[rgb(var(--muted-foreground))]">
                      Vốn: <strong className="text-[rgb(var(--foreground))]">{formatCurrency(lot.costPrice)}</strong>
                    </p>
                    <p className="text-xs font-bold text-emerald-500 mt-0.5">
                      Tồn: {lot.quantity}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}
