import { useState, useEffect } from 'react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { Invoice, InvoiceItem, InventoryUnitRecord } from '@/types';
import { ReturnItemCondition } from '@/types';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  X, RotateCcw, ArrowRightLeft, CheckSquare, Square, Search,
  AlertTriangle, Check, DollarSign, Package, ShieldAlert, Loader2,
} from 'lucide-react';

interface ReturnExchangeModalProps {
  invoice: Invoice;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReturnExchangeModal({ invoice, onClose, onSuccess }: ReturnExchangeModalProps) {
  const [activeTab, setActiveTab] = useState<'RETURN' | 'EXCHANGE'>('RETURN');
  const [submitting, setSubmitting] = useState(false);

  // Available non-returned items
  const eligibleItems = invoice.items.map((item, index) => ({
    ...item,
    originalOrder: index,
  })).filter((item) => (item.itemStatus || 'SOLD') === 'SOLD');

  // Selected item orders
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);

  // ------------------------------------------------------------------
  // RETURN STATE
  // ------------------------------------------------------------------
  const [returnConfig, setReturnConfig] = useState<
    Record<
      number,
      {
        refundAmount: number;
        debtReduction: number;
        condition: ReturnItemCondition;
      }
    >
  >({});

  const [returnReason, setReturnReason] = useState('');
  const [returnNotes, setReturnNotes] = useState('');

  // Initialize Return Config when selected orders change
  useEffect(() => {
    const newConfig: typeof returnConfig = { ...returnConfig };
    const maxDebt = Math.max(0, invoice.remainingAmount || 0);

    selectedOrders.forEach((order) => {
      if (!newConfig[order]) {
        const item = invoice.items[order];
        const itemTotal = item.total || item.unitPrice * item.quantity;
        newConfig[order] = {
          refundAmount: itemTotal,
          debtReduction: 0,
          condition: ReturnItemCondition.GOOD_RESTOCK,
        };
      }
    });
    setReturnConfig(newConfig);
  }, [selectedOrders]);

  // ------------------------------------------------------------------
  // EXCHANGE STATE
  // ------------------------------------------------------------------
  const [exchangeConfig, setExchangeConfig] = useState<
    Record<
      number,
      {
        oldCondition: ReturnItemCondition;
        newProductId: string;
        newProductCode: string;
        newProductName: string;
        newSerialNumber?: string;
        newSalePrice: number;
        customerPaidExtra: number;
        customerDebtAdded: number;
        cashRefund: number;
        debtReduction: number;
      }
    >
  >({});

  const [exchangeReason, setExchangeReason] = useState('');

  // Replacement Product Search Modal State
  const [activeExchangeOrder, setActiveExchangeOrder] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [searchedProducts, setSearchedProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Replacement Serial Search State
  const [availableSerials, setAvailableSerials] = useState<InventoryUnitRecord[]>([]);
  const [loadingSerials, setLoadingSerials] = useState(false);

  // Search Products for Exchange
  useEffect(() => {
    if (activeExchangeOrder === null) return;

    const timer = setTimeout(async () => {
      setLoadingProducts(true);
      try {
        const res = await api.get('/products', {
          params: {
            search: productSearch.trim() || undefined,
            limit: 20,
          },
        });
        if (res.data.success) {
          setSearchedProducts(res.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingProducts(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [productSearch, activeExchangeOrder]);


  const toggleSelectAll = () => {
    if (selectedOrders.length === eligibleItems.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(eligibleItems.map((i) => i.originalOrder));
    }
  };

  const toggleSelectItem = (order: number) => {
    if (selectedOrders.includes(order)) {
      setSelectedOrders(selectedOrders.filter((o) => o !== order));
    } else {
      setSelectedOrders([...selectedOrders, order]);
    }
  };

  // Select Replacement Product for Exchange line
  const handleSelectReplacementProduct = async (prod: any) => {
    if (activeExchangeOrder === null) return;
    const order = activeExchangeOrder;
    const oldItem = invoice.items[order];
    const oldSalePrice = oldItem.total || oldItem.unitPrice * oldItem.quantity;
    const defaultNewPrice = prod.sellingPrice || 0;
    const priceDiff = defaultNewPrice - oldSalePrice;

    setExchangeConfig({
      ...exchangeConfig,
      [order]: {
        oldCondition: ReturnItemCondition.GOOD_RESTOCK,
        newProductId: prod._id,
        newProductCode: prod.productCode,
        newProductName: prod.name,
        newSerialNumber: '',
        newSalePrice: defaultNewPrice,
        customerPaidExtra: priceDiff > 0 ? priceDiff : 0,
        customerDebtAdded: 0,
        cashRefund: priceDiff < 0 ? Math.abs(priceDiff) : 0,
        debtReduction: 0,
      },
    });

    // Fetch Available Serials for selected product
    try {
      setLoadingSerials(true);
      const res = await api.get(`/inventory-units/by-product/${prod._id}`);
      if (res.data.success) {
        const units = res.data.data.filter((u: InventoryUnitRecord) => u.status === 'AVAILABLE');
        setAvailableSerials(units);
      }
    } catch {
      toast.error('Không thể tải Serial khả dụng của sản phẩm đổi');
    } finally {
      setLoadingSerials(false);
      setActiveExchangeOrder(null);
      setProductSearch('');
    }
  };

  // ------------------------------------------------------------------
  // CALCULATIONS
  // ------------------------------------------------------------------
  // Return Totals
  let totalReturnOriginalVal = 0;
  let totalReturnRefund = 0;
  let totalReturnDebtReduct = 0;
  let totalReturnRetained = 0;

  selectedOrders.forEach((order) => {
    const item = invoice.items[order];
    const origVal = item.total || item.unitPrice * item.quantity;
    const cfg = returnConfig[order] || { refundAmount: origVal, debtReduction: 0 };
    const refund = Number(cfg.refundAmount) || 0;
    const debtReduct = Number(cfg.debtReduction) || 0;
    const retained = Math.max(0, origVal - refund - debtReduct);

    totalReturnOriginalVal += origVal;
    totalReturnRefund += refund;
    totalReturnDebtReduct += debtReduct;
    totalReturnRetained += retained;
  });

  // Exchange Totals
  let totalExchangeOldVal = 0;
  let totalExchangeNewVal = 0;
  let totalExchangePaidExtra = 0;
  let totalExchangeDebtAdded = 0;
  let totalExchangeCashRefund = 0;
  let totalExchangeDebtReduct = 0;

  selectedOrders.forEach((order) => {
    const item = invoice.items[order];
    const oldVal = item.total || item.unitPrice * item.quantity;
    const cfg = exchangeConfig[order];
    if (cfg) {
      totalExchangeOldVal += oldVal;
      totalExchangeNewVal += Number(cfg.newSalePrice) || 0;
      totalExchangePaidExtra += Number(cfg.customerPaidExtra) || 0;
      totalExchangeDebtAdded += Number(cfg.customerDebtAdded) || 0;
      totalExchangeCashRefund += Number(cfg.cashRefund) || 0;
      totalExchangeDebtReduct += Number(cfg.debtReduction) || 0;
    }
  });

  // ------------------------------------------------------------------
  // SUBMISSION HANDLERS
  // ------------------------------------------------------------------
  const handleSubmitReturn = async () => {
    if (selectedOrders.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 sản phẩm để trả hàng');
      return;
    }

    if (totalReturnDebtReduct > invoice.remainingAmount) {
      toast.error(`Số tiền giảm công nợ vượt quá công nợ còn nợ hiện tại (${formatCurrency(invoice.remainingAmount)})`);
      return;
    }

    if (submitting) return;

    try {
      setSubmitting(true);
      const payload = {
        items: selectedOrders.map((order) => ({
          order,
          refundAmount: Number(returnConfig[order]?.refundAmount) || 0,
          debtReduction: Number(returnConfig[order]?.debtReduction) || 0,
          condition: returnConfig[order]?.condition || ReturnItemCondition.GOOD_RESTOCK,
        })),
        reason: returnReason,
        notes: returnNotes,
      };

      const res = await api.post(`/invoices/${invoice._id}/return`, payload);
      if (res.data.success) {
        toast.success('🎉 Thực hiện TRẢ HÀNG thành công và cập nhật kho!');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể thực hiện trả hàng');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitExchange = async () => {
    if (selectedOrders.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 sản phẩm để đổi hàng');
      return;
    }

    for (const order of selectedOrders) {
      const cfg = exchangeConfig[order];
      if (!cfg || !cfg.newProductId) {
        toast.error(`Chưa chọn sản phẩm đổi mới cho mục ${invoice.items[order].productSnapshot?.name}`);
        return;
      }
    }

    if (submitting) return;

    try {
      setSubmitting(true);
      const payload = {
        exchanges: selectedOrders.map((order) => ({
          order,
          oldCondition: exchangeConfig[order]?.oldCondition || ReturnItemCondition.GOOD_RESTOCK,
          newProductId: exchangeConfig[order].newProductId,
          newSerialNumber: exchangeConfig[order].newSerialNumber,
          newSalePrice: Number(exchangeConfig[order].newSalePrice) || 0,
          customerPaidExtra: Number(exchangeConfig[order].customerPaidExtra) || 0,
          customerDebtAdded: Number(exchangeConfig[order].customerDebtAdded) || 0,
          cashRefund: Number(exchangeConfig[order].cashRefund) || 0,
          debtReduction: Number(exchangeConfig[order].debtReduction) || 0,
        })),
        reason: exchangeReason,
      };

      const res = await api.post(`/invoices/${invoice._id}/exchange`, payload);
      if (res.data.success) {
        toast.success('🎉 Thực hiện ĐỔI HÀNG thành công và cập nhật xuất/nhập kho!');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể thực hiện đổi hàng');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgb(var(--border))] bg-[rgb(var(--muted))/30] flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-blue-500" />
              Nghiệp Vụ Trả Hàng / Đổi Hàng
            </h2>
            <p className="text-xs text-[rgb(var(--muted-foreground))] mt-0.5 font-mono">
              Hóa đơn: <strong className="text-blue-500">{invoice.invoiceCode}</strong> • Khách: {invoice.customer?.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[rgb(var(--accent))] transition-smooth text-[rgb(var(--muted-foreground))]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Tabs */}
        <div className="flex border-b border-[rgb(var(--border))] bg-[rgb(var(--background))] px-6 pt-3 flex-shrink-0 gap-3">
          <button
            onClick={() => setActiveTab('RETURN')}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-sm font-bold border-b-2 transition-all',
              activeTab === 'RETURN'
                ? 'border-blue-500 text-blue-500 bg-[rgb(var(--card))] shadow-sm'
                : 'border-transparent text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]'
            )}
          >
            <RotateCcw className="w-4 h-4" />
            1. KHÁCH TRẢ HÀNG (HOÀN TIỀN / GIẢM NỢ)
          </button>
          <button
            onClick={() => setActiveTab('EXCHANGE')}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-sm font-bold border-b-2 transition-all',
              activeTab === 'EXCHANGE'
                ? 'border-purple-500 text-purple-500 bg-[rgb(var(--card))] shadow-sm'
                : 'border-transparent text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]'
            )}
          >
            <ArrowRightLeft className="w-4 h-4" />
            2. KHÁCH ĐỔI SẢN PHẨM MỚI
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Section 1: Item Picker */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-[rgb(var(--muted-foreground))] uppercase tracking-wider">
                Chọn sản phẩm trong hóa đơn để thao tác ({selectedOrders.length}/{eligibleItems.length})
              </h3>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs text-blue-500 hover:text-blue-400 font-semibold flex items-center gap-1"
              >
                {selectedOrders.length === eligibleItems.length ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" /> Bỏ chọn tất cả
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5" /> Chọn tất cả sản phẩm
                  </>
                )}
              </button>
            </div>

            {eligibleItems.length === 0 ? (
              <div className="p-8 text-center bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-sm font-semibold">
                Tất cả sản phẩm trong hóa đơn này đã được trả hoặc đổi hết trước đó!
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {eligibleItems.map((item) => {
                  const isSelected = selectedOrders.includes(item.originalOrder);
                  const itemTotal = item.total || item.unitPrice * item.quantity;
                  return (
                    <div
                      key={item.originalOrder}
                      onClick={() => toggleSelectItem(item.originalOrder)}
                      className={cn(
                        'flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer',
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10 shadow-sm'
                          : 'border-[rgb(var(--border))] bg-[rgb(var(--card))] hover:bg-[rgb(var(--accent))]'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-5 h-5 rounded flex items-center justify-center border transition-smooth',
                            isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-[rgb(var(--border))]'
                          )}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{item.productSnapshot?.name}</p>
                          <p className="text-xs text-[rgb(var(--muted-foreground))]">
                            Mã SP: {item.productSnapshot?.productCode} • Serial:{' '}
                            <span className="font-mono font-semibold text-blue-400">
                              {item.serialNumber || (item.selectedSerials || []).join(', ') || 'Không serial'}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-bold text-blue-500">{formatCurrency(itemTotal)}</p>
                        <p className="text-[10px] text-[rgb(var(--muted-foreground))]">Giá bán ra</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* TAB 1: RETURN CONFIGURATION */}
          {activeTab === 'RETURN' && selectedOrders.length > 0 && (
            <div className="space-y-5 animate-fade-in border-t border-[rgb(var(--border))] pt-5">
              <h3 className="text-xs font-bold text-[rgb(var(--muted-foreground))] uppercase tracking-wider">
                Cấu hình tiền hoàn & tình trạng hàng trả về
              </h3>

              <div className="space-y-4">
                {selectedOrders.map((order) => {
                  const item = invoice.items[order];
                  const origVal = item.total || item.unitPrice * item.quantity;
                  const cfg = returnConfig[order] || {
                    refundAmount: origVal,
                    debtReduction: 0,
                    condition: ReturnItemCondition.GOOD_RESTOCK,
                  };

                  return (
                    <div key={order} className="p-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))/20] space-y-3">
                      <div className="flex items-center justify-between border-b border-[rgb(var(--border))] pb-2">
                        <p className="text-sm font-bold text-blue-400">{item.productSnapshot?.name}</p>
                        <p className="text-xs text-[rgb(var(--muted-foreground))]">
                          Giá bán ban đầu: <strong className="text-[rgb(var(--foreground))]">{formatCurrency(origVal)}</strong>
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Refund Cash */}
                        <div>
                          <label className="text-[11px] font-bold text-[rgb(var(--muted-foreground))] block mb-1">
                            Tiền hoàn lại khách (đ)
                          </label>
                          <input
                            type="number"
                            value={cfg.refundAmount}
                            onChange={(e) =>
                              setReturnConfig({
                                ...returnConfig,
                                [order]: { ...cfg, refundAmount: Math.max(0, Number(e.target.value) || 0) },
                              })
                            }
                            className="w-full px-3 py-1.5 rounded-lg text-sm bg-[rgb(var(--card))] border border-[rgb(var(--border))] font-bold text-emerald-500"
                          />
                        </div>

                        {/* Debt Reduction */}
                        {invoice.remainingAmount > 0 && (
                          <div>
                            <label className="text-[11px] font-bold text-[rgb(var(--muted-foreground))] block mb-1">
                              Giảm vào công nợ (đ)
                            </label>
                            <input
                              type="number"
                              value={cfg.debtReduction}
                              onChange={(e) =>
                                setReturnConfig({
                                  ...returnConfig,
                                  [order]: { ...cfg, debtReduction: Math.max(0, Number(e.target.value) || 0) },
                                })
                              }
                              className="w-full px-3 py-1.5 rounded-lg text-sm bg-[rgb(var(--card))] border border-[rgb(var(--border))] font-bold text-amber-500"
                            />
                          </div>
                        )}

                        {/* Item Condition */}
                        <div>
                          <label className="text-[11px] font-bold text-[rgb(var(--muted-foreground))] block mb-1">
                            Tình trạng hàng trả về
                          </label>
                          <select
                            value={cfg.condition}
                            onChange={(e) =>
                              setReturnConfig({
                                ...returnConfig,
                                [order]: { ...cfg, condition: e.target.value as ReturnItemCondition },
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-[rgb(var(--card))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
                          >
                            <option value={ReturnItemCondition.GOOD_RESTOCK}>✅ Tốt / nhập lại kho (AVAILABLE)</option>
                            <option value={ReturnItemCondition.INSPECTION}>🔍 Chờ kiểm tra (INSPECTION)</option>
                            <option value={ReturnItemCondition.WARRANTY}>🛠 Lỗi / bảo hành (WARRANTY)</option>
                            <option value={ReturnItemCondition.DAMAGED}>❌ Hỏng / không nhập kho (DAMAGED)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Financial Summary Box */}
              <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[rgb(var(--muted-foreground))] font-medium">Tổng giá trị hàng trả:</span>
                  <span className="font-bold">{formatCurrency(totalReturnOriginalVal)}</span>
                </div>
                {totalReturnDebtReduct > 0 && (
                  <div className="flex items-center justify-between text-amber-500">
                    <span className="font-medium">Tổng tiền giảm vào công nợ:</span>
                    <span className="font-bold">-{formatCurrency(totalReturnDebtReduct)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-emerald-500">
                  <span className="font-medium">Tổng thực tế hoàn tiền cho khách:</span>
                  <span className="font-bold text-sm">-{formatCurrency(totalReturnRefund)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-blue-500/20 pt-2 text-[rgb(var(--foreground))]">
                  <span className="font-semibold">Cửa hàng giữ lại (Lợi nhuận ghi nhận):</span>
                  <span className="font-extrabold text-blue-400">+{formatCurrency(totalReturnRetained)}</span>
                </div>
              </div>

              {/* Reason & Note */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Lý do trả hàng (VD: Khách đổi ý, Nhầm mã...)"
                  className="px-3 py-2 rounded-xl text-xs bg-[rgb(var(--background))] border border-[rgb(var(--border))]"
                />
                <input
                  type="text"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Ghi chú thêm..."
                  className="px-3 py-2 rounded-xl text-xs bg-[rgb(var(--background))] border border-[rgb(var(--border))]"
                />
              </div>
            </div>
          )}

          {/* TAB 2: EXCHANGE CONFIGURATION */}
          {activeTab === 'EXCHANGE' && selectedOrders.length > 0 && (
            <div className="space-y-5 animate-fade-in border-t border-[rgb(var(--border))] pt-5">
              <h3 className="text-xs font-bold text-[rgb(var(--muted-foreground))] uppercase tracking-wider">
                Chọn sản phẩm mới thay thế trong kho
              </h3>

              <div className="space-y-4">
                {selectedOrders.map((order) => {
                  const item = invoice.items[order];
                  const oldVal = item.total || item.unitPrice * item.quantity;
                  const cfg = exchangeConfig[order];

                  return (
                    <div key={order} className="p-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))/20] space-y-3">
                      {/* Old Item Header */}
                      <div className="flex items-center justify-between text-xs border-b border-[rgb(var(--border))] pb-2">
                        <div>
                          <span className="font-bold text-red-400">Sản phẩm cũ: </span>
                          <span className="font-semibold">{item.productSnapshot?.name}</span>
                        </div>
                        <span className="font-bold text-[rgb(var(--muted-foreground))]">{formatCurrency(oldVal)}</span>
                      </div>

                      {/* Product Picker Button or Selected Product Display */}
                      {!cfg ? (
                        <button
                          type="button"
                          onClick={() => setActiveExchangeOrder(order)}
                          className="w-full py-3 px-4 rounded-xl border border-dashed border-purple-500/50 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 text-xs font-bold transition-smooth flex items-center justify-center gap-2"
                        >
                          <Search className="w-4 h-4" />
                          + Bấm vào đây để chọn Sản Phẩm Mới Đổi Thay Thế
                        </button>
                      ) : (
                        <div className="p-3 rounded-xl bg-[rgb(var(--card))] border border-purple-500/30 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-purple-400">✨ SP Mới: {cfg.newProductName}</p>
                              <p className="text-[10px] text-[rgb(var(--muted-foreground))]">Mã: {cfg.newProductCode}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveExchangeOrder(order)}
                              className="text-[10px] text-blue-500 hover:underline font-semibold"
                            >
                              Đổi SP khác
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                              <label className="text-[10px] text-[rgb(var(--muted-foreground))] block mb-1 font-semibold">
                                Serial SP mới trong kho
                              </label>
                              <select
                                value={cfg.newSerialNumber || ''}
                                onChange={(e) =>
                                  setExchangeConfig({
                                    ...exchangeConfig,
                                    [order]: { ...cfg, newSerialNumber: e.target.value },
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg bg-[rgb(var(--background))] border border-[rgb(var(--border))] font-mono font-semibold text-purple-400"
                              >
                                <option value="">-- Tự động gán Serial khả dụng --</option>
                                {availableSerials.map((u) => (
                                  <option key={u._id} value={u.serialNumber}>
                                    {u.serialNumber} (Giá nhập: {formatCurrency(u.purchasePrice)})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] text-[rgb(var(--muted-foreground))] block mb-1 font-semibold">
                                Giá bán áp dụng cho lần đổi (đ)
                              </label>
                              <input
                                type="number"
                                value={cfg.newSalePrice}
                                onChange={(e) => {
                                  const newPrice = Math.max(0, Number(e.target.value) || 0);
                                  const diff = newPrice - oldVal;
                                  setExchangeConfig({
                                    ...exchangeConfig,
                                    [order]: {
                                      ...cfg,
                                      newSalePrice: newPrice,
                                      customerPaidExtra: diff > 0 ? diff : 0,
                                      cashRefund: diff < 0 ? Math.abs(diff) : 0,
                                    },
                                  });
                                }}
                                className="w-full px-3 py-1.5 rounded-lg bg-[rgb(var(--background))] border border-[rgb(var(--border))] font-bold text-purple-400"
                              />
                            </div>
                          </div>

                          {/* Extra Payment Inputs */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[rgb(var(--border))]">
                            {cfg.newSalePrice > oldVal ? (
                              <>
                                <div>
                                  <label className="text-[10px] text-[rgb(var(--muted-foreground))] block mb-0.5">Khách bù thêm (đ)</label>
                                  <input
                                    type="number"
                                    value={cfg.customerPaidExtra}
                                    onChange={(e) =>
                                      setExchangeConfig({
                                        ...exchangeConfig,
                                        [order]: { ...cfg, customerPaidExtra: Math.max(0, Number(e.target.value) || 0) },
                                      })
                                    }
                                    className="w-full px-2 py-1 rounded text-xs bg-[rgb(var(--background))] border border-[rgb(var(--border))] font-bold text-emerald-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-[rgb(var(--muted-foreground))] block mb-0.5">Cộng vào nợ (đ)</label>
                                  <input
                                    type="number"
                                    value={cfg.customerDebtAdded}
                                    onChange={(e) =>
                                      setExchangeConfig({
                                        ...exchangeConfig,
                                        [order]: { ...cfg, customerDebtAdded: Math.max(0, Number(e.target.value) || 0) },
                                      })
                                    }
                                    className="w-full px-2 py-1 rounded text-xs bg-[rgb(var(--background))] border border-[rgb(var(--border))] font-bold text-amber-500"
                                  />
                                </div>
                              </>
                            ) : (
                              <div>
                                <label className="text-[10px] text-[rgb(var(--muted-foreground))] block mb-0.5">Hoàn chênh lệch (đ)</label>
                                <input
                                  type="number"
                                  value={cfg.cashRefund}
                                  onChange={(e) =>
                                    setExchangeConfig({
                                      ...exchangeConfig,
                                      [order]: { ...cfg, cashRefund: Math.max(0, Number(e.target.value) || 0) },
                                    })
                                  }
                                  className="w-full px-2 py-1 rounded text-xs bg-[rgb(var(--background))] border border-[rgb(var(--border))] font-bold text-emerald-500"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <input
                type="text"
                value={exchangeReason}
                onChange={(e) => setExchangeReason(e.target.value)}
                placeholder="Lý do đổi hàng..."
                className="w-full px-3 py-2 rounded-xl text-xs bg-[rgb(var(--background))] border border-[rgb(var(--border))]"
              />
            </div>
          )}

          {/* Product Search Sub-Modal for Exchange */}
          {activeExchangeOrder !== null && (
            <div className="p-4 rounded-xl border border-purple-500/40 bg-purple-500/10 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-purple-300">Tìm kiếm mã sản phẩm trong kho để thay thế:</p>
                <button
                  onClick={() => setActiveExchangeOrder(null)}
                  className="text-xs text-[rgb(var(--muted-foreground))] hover:underline"
                >
                  Đóng
                </button>
              </div>

              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Nhập tên sản phẩm, mã SP, thương hiệu..."
                className="w-full px-3 py-2 rounded-xl text-sm bg-[rgb(var(--card))] border border-[rgb(var(--border))]"
                autoFocus
              />

              {loadingProducts ? (
                <div className="py-4 text-center text-xs text-[rgb(var(--muted-foreground))]">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2 text-purple-400" />
                  Đang tải danh sách sản phẩm...
                </div>
              ) : searchedProducts.length > 0 ? (
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {searchedProducts.map((p) => (
                    <div
                      key={p._id}
                      onClick={() => handleSelectReplacementProduct(p)}
                      className="p-2.5 rounded-lg bg-[rgb(var(--card))] border border-[rgb(var(--border))] hover:border-purple-500 cursor-pointer flex items-center justify-between text-xs transition-all"
                    >
                      <div>
                        <span className="font-bold">{p.name}</span>
                        <span className="text-[10px] text-[rgb(var(--muted-foreground))] block">
                          Mã: {p.productCode} • Loại: {p.category}
                        </span>
                      </div>
                      <span className="font-bold text-purple-400">{formatCurrency(p.sellingPrice || 0)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-amber-500 font-semibold">
                  Không tìm thấy sản phẩm nào phù hợp với từ khóa "{productSearch}"
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-[rgb(var(--border))] bg-[rgb(var(--muted))/30] flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[rgb(var(--accent))]"
          >
            Hủy Bỏ
          </button>

          {activeTab === 'RETURN' ? (
            <button
              type="button"
              onClick={handleSubmitReturn}
              disabled={submitting || selectedOrders.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-blue-500/25 hover:opacity-90 disabled:opacity-40 transition-all"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              XÁC NHẬN TRẢ HÀNG ({selectedOrders.length} SP)
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmitExchange}
              disabled={submitting || selectedOrders.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold shadow-lg shadow-purple-500/25 hover:opacity-90 disabled:opacity-40 transition-all"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRightLeft className="w-4 h-4" />
              )}
              XÁC NHẬN ĐỔI HÀNG ({selectedOrders.length} SP)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
