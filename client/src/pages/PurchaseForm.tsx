import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  Truck,
  Building2,
  Plus,
  Trash2,
  Package,
  Calendar,
  DollarSign,
  AlertCircle,
  X,
  FileText,
} from 'lucide-react';
import api from '@/lib/api';
import { ProductCondition } from '@/types';
import type { SupplierRecord } from '@/types';
import { formatCurrency } from '@/lib/utils';

export function PurchaseForm() {
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [supplierId, setSupplierId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Items State
  const [items, setItems] = useState<
    Array<{
      productId: string;
      productName: string;
      productCode: string;
      quantity: number;
      costPrice: number;
      condition: ProductCondition;
      supplierWarrantyMonths: number;
      serialsRaw: string;
    }>
  >([
    {
      productId: '',
      productName: '',
      productCode: '',
      quantity: 1,
      costPrice: 0,
      condition: ProductCondition.LIKE_NEW,
      supplierWarrantyMonths: 12,
      serialsRaw: '',
    },
  ]);

  // Inline Quick Add Supplier Modal State
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierCompany, setNewSupplierCompany] = useState('');
  const [creatingSupplier, setCreatingSupplier] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [supRes, prodRes] = await Promise.all([
          api.get('/suppliers', { params: { limit: 100 } }),
          api.get('/products', { params: { limit: 200 } }),
        ]);

        if (supRes.data.success) {
          setSuppliers(supRes.data.data);
        }
        if (prodRes.data.success) {
          setProducts(prodRes.data.data);
        }
      } catch (err: any) {
        toast.error('Không thể tải dữ liệu Khởi tạo');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleQuickAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim()) {
      toast.error('Vui lòng nhập tên Nhà cung cấp');
      return;
    }

    try {
      setCreatingSupplier(true);
      const res = await api.post('/suppliers', {
        name: newSupplierName.trim(),
        phone: newSupplierPhone.trim(),
        companyName: newSupplierCompany.trim(),
      });

      if (res.data.success) {
        const newSup = res.data.data;
        toast.success(`Đã thêm NCC: ${newSup.name}`);
        setSuppliers([newSup, ...suppliers]);
        setSupplierId(newSup._id);
        setShowSupplierModal(false);
        setNewSupplierName('');
        setNewSupplierPhone('');
        setNewSupplierCompany('');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể thêm NCC');
    } finally {
      setCreatingSupplier(false);
    }
  };

  const getPid = (p: any) => typeof p?._id === 'string' ? p._id : (p?._id?.toString() || p?.id || String(p?._id || ''));

  const handleProductSelect = (index: number, pId: string) => {
    const prod = products.find((p) => getPid(p) === pId);
    const updated = [...items];
    if (prod) {
      updated[index] = {
        ...updated[index],
        productId: getPid(prod),
        productName: prod.name,
        productCode: prod.productCode,
      };
    } else {
      updated[index] = {
        ...updated[index],
        productId: '',
        productName: '',
        productCode: '',
      };
    }
    setItems(updated);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        productId: '',
        productName: '',
        productCode: '',
        quantity: 1,
        costPrice: 0,
        condition: ProductCondition.LIKE_NEW,
        supplierWarrantyMonths: 12,
        serialsRaw: '',
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculate totals
  const totalAmount = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.costPrice) || 0), 0);
  const remainingDebt = Math.max(0, totalAmount - (Number(paidAmount) || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId) {
      toast.error('Vui lòng chọn Nhà cung cấp');
      return;
    }

    if (items.length === 0) {
      toast.error('Vui lòng thêm ít nhất 1 sản phẩm');
      return;
    }

    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.productId) {
        toast.error(`Mục ${i + 1}: Vui lòng chọn sản phẩm`);
        return;
      }
      if (it.quantity <= 0) {
        toast.error(`Mục ${i + 1}: Số lượng phải lớn hơn 0`);
        return;
      }

      // Parse serials
      const serialList = (it.serialsRaw || '')
        .split(/[\n,;\t]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      if (serialList.length !== Number(it.quantity)) {
        toast.error(
          `Mục ${i + 1} (${it.productName}): Đã nhập số lượng là ${it.quantity} nhưng danh sách Serial có ${serialList.length} mã. Vui lòng kiểm tra lại!`
        );
        return;
      }
    }

    if (remainingDebt > 0 && !dueDate) {
      toast.error('Vui lòng chọn HẠN THANH TOÁN CÔNG NỢ NCC cho khoản nợ còn thiếu');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/purchases', {
        supplierId,
        purchaseDate,
        notes,
        paidAmount: Number(paidAmount) || 0,
        dueDate: remainingDebt > 0 ? dueDate : undefined,
        items,
      });

      if (res.data.success) {
        toast.success(`Đã tạo phiếu nhập hàng thành công! Mã: ${res.data.data.purchaseCode}`);
        navigate('/purchases');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể tạo phiếu nhập hàng');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-sm text-[rgb(var(--muted-foreground))]">
        Đang tải dữ liệu khởi tạo phiếu nhập...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/purchases')}
          className="p-2.5 rounded-xl border border-[rgb(var(--border))] text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] hover:bg-[rgb(var(--accent))] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[rgb(var(--foreground))]">
            Tạo Phiếu Nhập Hàng Mới
          </h1>
          <p className="text-sm text-[rgb(var(--muted-foreground))] mt-0.5">
            Nhập linh kiện vật lý theo Serial Number từ Nhà cung cấp
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Supplier & General Info Section */}
        <div className="p-6 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[rgb(var(--border))] pb-3">
            <h3 className="font-bold text-base text-[rgb(var(--foreground))] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-500" />
              Thông Tin Nhà Cung Cấp & Phiếu Nhập
            </h3>
            <button
              type="button"
              onClick={() => setShowSupplierModal(true)}
              className="text-xs font-semibold text-blue-500 hover:text-blue-600 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm NCC Mới</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                Chọn Nhà Cung Cấp <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
              >
                <option value="">-- Chọn Nhà cung cấp từ danh sách --</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.supplierCode} - {s.name} {s.phone ? `(${s.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                Ngày Nhập Hàng
              </label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                Ghi Chú Phiếu Nhập
              </label>
              <input
                type="text"
                placeholder="Ghi chú người giao hàng, mã vận đơn..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
              />
            </div>
          </div>
        </div>

        {/* Products & Serials Section */}
        <div className="p-6 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[rgb(var(--border))] pb-3">
            <h3 className="font-bold text-base text-[rgb(var(--foreground))] flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-500" />
              Danh Sách Sản Phẩm & Serial Hàng Nhập
            </h3>
            <button
              type="button"
              onClick={addItemRow}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Sản Phẩm</span>
            </button>
          </div>

          <div className="space-y-6 divide-y divide-[rgb(var(--border))]">
            {items.map((it, idx) => (
              <div key={idx} className={`${idx > 0 ? 'pt-6' : ''} space-y-4`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">
                    # Mục {idx + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="p-1 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                      title="Xóa mục này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                      Mã Sản Phẩm / Tên Sản Phẩm <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={it.productId}
                      onChange={(e) => handleProductSelect(idx, e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
                    >
                      <option value="">-- Chọn sản phẩm có sẵn --</option>
                      {products.map((p) => {
                        const pid = getPid(p);
                        return (
                          <option key={pid} value={pid}>
                            [{p.productCode}] {p.name}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                      Số Lượng Nhập <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={it.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                      Giá Nhập / Cái (₫) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={it.costPrice}
                      onChange={(e) => handleItemChange(idx, 'costPrice', Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                      Tình Trạng Thiết Bị
                    </label>
                    <select
                      value={it.condition}
                      onChange={(e) => handleItemChange(idx, 'condition', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
                    >
                      <option value={ProductCondition.NEW}>New (Mới 100%)</option>
                      <option value={ProductCondition.LIKE_NEW}>Like New</option>
                      <option value={ProductCondition.NINETY_NINE}>99%</option>
                      <option value={ProductCondition.NINETY_FIVE}>95%</option>
                      <option value={ProductCondition.USED}>Cũ</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                      Bảo Hành NCC (Số tháng)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={it.supplierWarrantyMonths}
                      onChange={(e) => handleItemChange(idx, 'supplierWarrantyMonths', Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-end font-bold text-sm text-[rgb(var(--foreground))]">
                    Thành tiền: {formatCurrency((it.quantity || 0) * (it.costPrice || 0))}
                  </div>
                </div>

                {/* Bulk Serial Paste Area */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-indigo-500">
                      Danh Sách Serial Number ({it.quantity} mã) <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-[rgb(var(--muted-foreground))]">
                      Cho phép paste nhiều Serial (mỗi Serial một dòng)
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    required
                    placeholder={`Paste danh sách Serial tại đây...\nVí dụ:\nSN001\nSN002\nSN003`}
                    value={it.serialsRaw}
                    onChange={(e) => handleItemChange(idx, 'serialsRaw', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="text-[11px] text-[rgb(var(--muted-foreground))] mt-1">
                    Số Serial đã nhập:{' '}
                    <span className="font-bold text-[rgb(var(--foreground))]">
                      {(it.serialsRaw || '').split(/[\n,;\t]+/).filter((s) => s.trim().length > 0).length}
                    </span>{' '}
                    / {it.quantity}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment & Supplier Debt Section */}
        <div className="p-6 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm space-y-4">
          <h3 className="font-bold text-base text-[rgb(var(--foreground))] flex items-center gap-2 border-b border-[rgb(var(--border))] pb-3">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            Thanh Toán Cho Nhà Cung Cấp & Công Nợ
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[rgb(var(--muted))/30] space-y-1">
              <div className="text-xs text-[rgb(var(--muted-foreground))]">Tổng Giá Trị Phiếu Nhập:</div>
              <div className="text-xl font-bold text-[rgb(var(--foreground))]">
                {formatCurrency(totalAmount)}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                Số Tiền Đã Trả NCC (₫)
              </label>
              <input
                type="number"
                min={0}
                max={totalAmount}
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                Còn Nợ NCC (Tự động tính)
              </label>
              <div className="w-full px-3 py-2.5 rounded-xl text-sm font-bold bg-[rgb(var(--muted))/30] text-amber-500">
                {formatCurrency(remainingDebt)}
              </div>
            </div>
          </div>

          {remainingDebt > 0 && (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase">
                <AlertCircle className="w-4 h-4" />
                Vui lòng chọn Hạn Thanh Toán Công Nợ Nhà Cung Cấp
              </div>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full sm:w-64 px-3 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
              />
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/purchases')}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--accent))]"
          >
            Hủy Bỏ
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50"
          >
            {submitting ? 'Đang tạo...' : 'Xác Nhận Tạo Phiếu Nhập Hàng'}
          </button>
        </div>
      </form>

      {/* Inline Quick Add Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[rgb(var(--border))] bg-[rgb(var(--muted))/30]">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-base text-[rgb(var(--foreground))]">
                  Thêm Nhanh Nhà Cung Cấp
                </h3>
              </div>
              <button
                onClick={() => setShowSupplierModal(false)}
                className="p-1 rounded-lg text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--accent))]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddSupplier} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                  Tên NCC <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Tên nhà cung cấp..."
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                  Số Điện Thoại
                </label>
                <input
                  type="text"
                  placeholder="0988..."
                  value={newSupplierPhone}
                  onChange={(e) => setNewSupplierPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                  Tên Công Ty (Nếu có)
                </label>
                <input
                  type="text"
                  placeholder="Công ty TNHH..."
                  value={newSupplierCompany}
                  onChange={(e) => setNewSupplierCompany(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgb(var(--border))]">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--accent))]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creatingSupplier}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {creatingSupplier ? 'Đang tạo...' : 'Tạo & Chọn Ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
