import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  BookmarkPlus,
  RotateCcw,
} from 'lucide-react';
import api from '@/lib/api';
import { ProductCondition, ProductCategory } from '@/types';
import type { SupplierRecord } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { ProductSearchSelect } from '@/components/shared/ProductSearchSelect';

const NP_PURCHASE_DRAFT_KEY = 'np_purchase_draft_form_v1';

export function PurchaseForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Draft banner state
  const [hasDraft, setHasDraft] = useState(false);
  const [draftTime, setDraftTime] = useState<string>('');

  // Form State
  const [supplierId, setSupplierId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [debtDays, setDebtDays] = useState<number>(30); // Số ngày nợ công nợ
  const [dueMode, setDueMode] = useState<'days' | 'calendar'>('days'); // Chế độ nhập công nợ: 'days' (nhập số ngày) hoặc 'calendar' (chọn trên lịch)
  const [calendarDueDate, setCalendarDueDate] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Items State
  const [items, setItems] = useState<
    Array<{
      productId: string;
      productName: string;
      productCode: string;
      quantity: number;
      costPrice: number;
      listPrice: number;
      condition: ProductCondition;
      supplierWarrantyValue: number;
      supplierWarrantyUnit: 'day' | 'month' | 'year';
      serialsRaw: string;
    }>
  >([
    {
      productId: '',
      productName: '',
      productCode: '',
      quantity: 1,
      costPrice: 0,
      listPrice: 0,
      condition: ProductCondition.LIKE_NEW,
      supplierWarrantyValue: 12,
      supplierWarrantyUnit: 'month',
      serialsRaw: '',
    },
  ]);

  // Inline Quick Add Supplier Modal State
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierCompany, setNewSupplierCompany] = useState('');
  const [creatingSupplier, setCreatingSupplier] = useState(false);

  // Inline Quick Add Master Product Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [targetItemIndex, setTargetItemIndex] = useState<number | null>(null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [showAllSpecs, setShowAllSpecs] = useState(false);
  const [newProdData, setNewProdData] = useState({
    name: '',
    category: ProductCategory.CPU,
    brand: '',
    model: '',
    description: '',
    specs: {
      cpu: '',
      mainboard: '',
      ram: '',
      ssd: '',
      hdd: '',
      vga: '',
      psu: '',
      case: '',
      cooler: '',
      notes: '',
    },
  });

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

        // If editing existing draft purchase from server
        if (id) {
          const pRes = await api.get(`/purchases/${id}`);
          if (pRes.data.success && pRes.data.data) {
            const p = pRes.data.data;
            if (p.supplierId || p.supplier?._id) setSupplierId(p.supplierId || p.supplier?._id);
            if (p.purchaseDate) setPurchaseDate(new Date(p.purchaseDate).toISOString().split('T')[0]);
            if (p.notes) setNotes(p.notes);
            if (p.paidAmount !== undefined) setPaidAmount(p.paidAmount);
            if (p.dueDate) {
              setDueMode('calendar');
              setCalendarDueDate(new Date(p.dueDate).toISOString().split('T')[0]);
            }
            if (p.items && p.items.length > 0) {
              setItems(
                p.items.map((it: any) => ({
                  productId: typeof it.product === 'object' ? it.product._id : it.product || '',
                  productName: it.productName || '',
                  productCode: it.productCode || '',
                  quantity: it.quantity || 1,
                  costPrice: it.costPrice || 0,
                  listPrice: it.listPrice || it.costPrice || 0,
                  condition: it.condition || ProductCondition.LIKE_NEW,
                  supplierWarrantyValue: it.supplierWarrantyValue || it.supplierWarrantyMonths || 12,
                  supplierWarrantyUnit: it.supplierWarrantyUnit || 'month',
                  serialsRaw: Array.isArray(it.serials) ? it.serials.join('\n') : '',
                }))
              );
            }
          }
        } else {
          const savedDraft = localStorage.getItem(NP_PURCHASE_DRAFT_KEY);
          if (savedDraft) {
            const draft = JSON.parse(savedDraft);
            setHasDraft(true);
            setDraftTime(draft.savedAt);
          }
        }
      } catch (err: any) {
        toast.error('Không thể tải dữ liệu Khởi tạo');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const saveDraft = (showToast = true) => {
    const draft = {
      supplierId,
      purchaseDate,
      notes,
      paidAmount,
      debtDays,
      dueMode,
      calendarDueDate,
      items,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(NP_PURCHASE_DRAFT_KEY, JSON.stringify(draft));
    setHasDraft(true);
    setDraftTime(draft.savedAt);
    if (showToast) toast.success('Đã lưu tạm phiếu nhập');
  };

  const restoreDraft = () => {
    const savedDraft = localStorage.getItem(NP_PURCHASE_DRAFT_KEY);
    if (savedDraft) {
      const draft = JSON.parse(savedDraft);
      setSupplierId(draft.supplierId);
      setPurchaseDate(draft.purchaseDate);
      setNotes(draft.notes);
      setPaidAmount(draft.paidAmount);
      setDebtDays(draft.debtDays);
      setDueMode(draft.dueMode);
      setCalendarDueDate(draft.calendarDueDate);
      setItems(draft.items);
      setHasDraft(false);
      toast.success('Đã khôi phục bản nháp');
    }
  };

  const clearDraft = () => {
    localStorage.removeItem(NP_PURCHASE_DRAFT_KEY);
    setHasDraft(false);
    toast.success('Đã xóa bản nháp');
  };

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
      toast.error(err.response?.data?.message || 'Không thể tạo Nhà cung cấp');
    } finally {
      setCreatingSupplier(false);
    }
  };

  const handleQuickAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdData.name.trim()) {
      toast.error('Vui lòng nhập Tên sản phẩm / linh kiện');
      return;
    }
    if (!newProdData.brand.trim()) {
      toast.error('Vui lòng nhập Thương hiệu / Hãng sản xuất');
      return;
    }
    if (!newProdData.model.trim()) {
      toast.error('Vui lòng nhập Model / Mã sản phẩm');
      return;
    }

    try {
      setCreatingProduct(true);
      const res = await api.post('/products', newProdData);
      if (res.data.success) {
        const createdProd = res.data.data;
        toast.success(`Đã tạo mã sản phẩm mới: [${createdProd.productCode}] ${createdProd.name}`);

        // Update local catalog list
        setProducts((prev) => [createdProd, ...prev]);

        // Auto select for the active row if targetItemIndex is set
        if (targetItemIndex !== null && targetItemIndex >= 0 && targetItemIndex < items.length) {
          handleProductSelect(targetItemIndex, getPid(createdProd));
        }

        // Close modal and reset form state
        setShowProductModal(false);
        setNewProdData({
          name: '',
          category: ProductCategory.CPU,
          brand: '',
          model: '',
          description: '',
          specs: {
            cpu: '', mainboard: '', ram: '', ssd: '', hdd: '', vga: '', psu: '', case: '', cooler: '', notes: '',
          },
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể tạo mã sản phẩm');
    } finally {
      setCreatingProduct(false);
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
    const currentItem = updated[index];

    // If costPrice is changed and listPrice was 0 or equal to old costPrice, auto update listPrice
    if (field === 'costPrice') {
      const numVal = Number(value) || 0;
      if (!currentItem.listPrice || currentItem.listPrice === currentItem.costPrice) {
        updated[index] = { ...currentItem, costPrice: numVal, listPrice: numVal };
      } else {
        updated[index] = { ...currentItem, costPrice: numVal };
      }
    } else {
      updated[index] = { ...currentItem, [field]: value };
    }
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
        listPrice: 0,
        condition: ProductCondition.LIKE_NEW,
        supplierWarrantyValue: 12,
        supplierWarrantyUnit: 'month',
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

  const handleSubmitForm = async (saveAsDraft: boolean) => {
    if (!supplierId) {
      toast.error('Vui lòng chọn Nhà cung cấp');
      return;
    }

    if (items.length === 0 || !items[0].productId) {
      toast.error('Vui lòng thêm ít nhất 1 sản phẩm nhập hàng');
      return;
    }

    if (!saveAsDraft) {
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

        // Validate serial count only if serials were entered
        const serialList = (it.serialsRaw || '')
          .split(/[\n,;\t]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        if (serialList.length > 0 && serialList.length !== Number(it.quantity)) {
          toast.error(
            `Mục ${i + 1} (${it.productName || 'Sản phẩm'}): Đã nhập ${serialList.length} Serial nhưng số lượng là ${it.quantity}. Vui lòng kiểm tra lại hoặc xóa hết Serial!`
          );
          return;
        }
      }
    }

    // Calculate computed due date
    let finalDueDateStr: string | undefined = undefined;
    if (!saveAsDraft && remainingDebt > 0) {
      if (dueMode === 'calendar') {
        if (!calendarDueDate) {
          toast.error('Vui lòng chọn Hạn Thanh Toán trên Lịch');
          return;
        }
        finalDueDateStr = calendarDueDate;
      } else {
        if (!debtDays || debtDays <= 0) {
          toast.error('Vui lòng nhập Số ngày nợ công nợ lớn hơn 0');
          return;
        }
        const calcObj = new Date(new Date(purchaseDate).getTime() + (Number(debtDays) || 0) * 86400000);
        finalDueDateStr = calcObj.toISOString().split('T')[0];
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        supplierId,
        purchaseDate,
        notes,
        paidAmount: Number(paidAmount) || 0,
        dueDate: finalDueDateStr,
        isDraft: saveAsDraft,
        items,
      };

      let res;
      if (id) {
        res = await api.put(`/purchases/${id}`, payload);
      } else {
        res = await api.post('/purchases', payload);
      }

      if (res.data.success) {
        if (saveAsDraft) {
          toast.success(`Đã lưu tạm phiếu nhập hàng thành công! Mã: ${res.data.data.purchaseCode}`);
        } else {
          toast.success(`Đã duyệt & nhập kho chính thức thành công! Mã: ${res.data.data.purchaseCode}`);
        }
        localStorage.removeItem(NP_PURCHASE_DRAFT_KEY);
        navigate('/purchases');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi tạo/lưu phiếu nhập');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmitForm(false);
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
        {/* Draft Recovery Banner */}
        {hasDraft && (
          <div className="mb-6 p-4 rounded-2xl border border-blue-500/30 bg-blue-500/10 flex items-center justify-between flex-wrap gap-3 animate-in fade-in-50">
            <div className="flex items-center gap-3">
              <BookmarkPlus className="w-5 h-5 text-blue-500 shrink-0" />
              <div>
                <div className="text-sm font-bold text-[rgb(var(--foreground))]">
                  Phát hiện bản nháp phiếu nhập đang được lưu tạm!
                </div>
                <div className="text-xs text-[rgb(var(--muted-foreground))]">
                  Thời gian lưu: {draftTime ? new Date(draftTime).toLocaleString('vi-VN') : 'Gần đây'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={restoreDraft}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Khôi Phục Bản Nháp</span>
              </button>
              <button
                type="button"
                onClick={clearDraft}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]"
              >
                Xóa Nháp
              </button>
            </div>
          </div>
        )}

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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setTargetItemIndex(items.length - 1);
                  setShowProductModal(true);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 flex items-center gap-1 transition-colors border border-indigo-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo Mã Sản Phẩm Mới</span>
              </button>
              <button
                type="button"
                onClick={addItemRow}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Dòng Linh Kiện</span>
              </button>
            </div>
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-[rgb(var(--foreground))]">
                        Mã Sản Phẩm / Tên Sản Phẩm <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setTargetItemIndex(idx);
                          setShowProductModal(true);
                        }}
                        className="text-xs font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1 hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Tạo mã mới</span>
                      </button>
                    </div>
                    <ProductSearchSelect
                      required
                      products={products}
                      value={it.productId}
                      onChange={(pId) => handleProductSelect(idx, pId)}
                      onAddNew={() => {
                        setTargetItemIndex(idx);
                        setShowProductModal(true);
                      }}
                      placeholder="-- Gõ từ khóa tìm hoặc chọn sản phẩm --"
                    />
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
                    <label className="block text-xs font-semibold text-emerald-500 mb-1">
                      Giá Niêm Yết / Bán (₫)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={it.listPrice ?? it.costPrice}
                      onChange={(e) => handleItemChange(idx, 'listPrice', Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl text-sm font-semibold bg-[rgb(var(--background))] border border-emerald-500/30 text-emerald-500 focus:border-emerald-500"
                      placeholder="Giá niêm yết bán..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                      Bảo Hành Từ NCC (Số lượng hoặc Chọn Lịch)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        value={it.supplierWarrantyValue ?? 12}
                        onChange={(e) => handleItemChange(idx, 'supplierWarrantyValue', Number(e.target.value))}
                        className="w-20 px-3 py-2 rounded-xl text-sm font-semibold bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
                      />
                      <select
                        value={it.supplierWarrantyUnit || 'month'}
                        onChange={(e) => handleItemChange(idx, 'supplierWarrantyUnit', e.target.value)}
                        className="px-2.5 py-2 rounded-xl text-sm font-semibold bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
                      >
                        <option value="day">Ngày</option>
                        <option value="month">Tháng</option>
                        <option value="year">Năm</option>
                      </select>
                      <input
                        type="date"
                        onChange={(e) => {
                          if (e.target.value) {
                            const pDate = new Date(purchaseDate).getTime();
                            const wDate = new Date(e.target.value).getTime();
                            const diffDays = Math.max(1, Math.round((wDate - pDate) / (1000 * 3600 * 24)));
                            const updated = [...items];
                            updated[idx] = {
                              ...updated[idx],
                              supplierWarrantyValue: diffDays,
                              supplierWarrantyUnit: 'day',
                            };
                            setItems(updated);
                          }
                        }}
                        title="Chọn ngày hết hạn bảo hành trên Lịch"
                        className="w-9 h-9 p-1.5 rounded-xl bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] cursor-pointer shrink-0"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-end font-bold text-sm text-[rgb(var(--foreground))]">
                    Thành tiền: {formatCurrency((it.quantity || 0) * (it.costPrice || 0))}
                  </div>
                </div>

                {/* Bulk Serial Paste Area */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-indigo-500">
                      Danh Sách Serial Number ({it.quantity} mã){' '}
                      <span className="text-[rgb(var(--muted-foreground))] font-normal">(Tùy chọn — không bắt buộc)</span>
                    </label>
                    <span className="text-[11px] text-[rgb(var(--muted-foreground))]">
                      Cho phép paste nhiều Serial (mỗi Serial một dòng)
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    placeholder={`Không bắt buộc — Paste danh sách Serial tại đây...\nVí dụ:\nSN001\nSN002\nSN003`}
                    value={it.serialsRaw}
                    onChange={(e) => handleItemChange(idx, 'serialsRaw', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="text-[11px] text-[rgb(var(--muted-foreground))] mt-1">
                    Số Serial đã nhập:{' '}
                    <span className={`font-bold ${
                      (() => {
                        const count = (it.serialsRaw || '').split(/[\n,;\t]+/).filter((s) => s.trim().length > 0).length;
                        return count === 0 ? 'text-[rgb(var(--muted-foreground))]' : count === it.quantity ? 'text-emerald-500' : 'text-amber-500';
                      })()
                    }`}>
                      {(it.serialsRaw || '').split(/[\n,;\t]+/).filter((s) => s.trim().length > 0).length}
                    </span>{' '}
                    / {it.quantity}
                    {(() => {
                      const count = (it.serialsRaw || '').split(/[\n,;\t]+/).filter((s) => s.trim().length > 0).length;
                      if (count === 0) return <span className="ml-2 italic">(Nhập kho không có Serial)</span>;
                      if (count === it.quantity) return <span className="ml-2 text-emerald-500">✓ Khớp số lượng</span>;
                      return <span className="ml-2 text-amber-500">⚠ Chưa khớp — cần {it.quantity} serial</span>;
                    })()}
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
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-wide">
                  <AlertCircle className="w-4 h-4" />
                  Thời Hạn Thanh Toán Công Nợ NCC
                </div>

                {/* Dual Mode Switcher Tabs */}
                <div className="flex items-center p-0.5 rounded-xl bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-xs">
                  <button
                    type="button"
                    onClick={() => setDueMode('days')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      dueMode === 'days'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]'
                    }`}
                  >
                    🔢 Nhập số ngày nợ
                  </button>
                  <button
                    type="button"
                    onClick={() => setDueMode('calendar')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      dueMode === 'calendar'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]'
                    }`}
                  >
                    📅 Chọn ngày trên lịch
                  </button>
                </div>
              </div>

              {dueMode === 'days' ? (
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[rgb(var(--foreground))]">Số ngày nợ:</span>
                      <input
                        type="number"
                        min={1}
                        required={remainingDebt > 0}
                        value={debtDays}
                        onChange={(e) => setDebtDays(Math.max(1, Number(e.target.value)))}
                        className="w-24 px-3 py-2 rounded-xl text-sm font-bold bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-amber-500 focus:outline-none focus:border-amber-500"
                        placeholder="Số ngày..."
                      />
                      <span className="text-xs font-semibold text-[rgb(var(--muted-foreground))]">ngày</span>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[7, 15, 30, 45, 60, 90].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDebtDays(d)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            debtDays === d
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'bg-[rgb(var(--background))] text-[rgb(var(--muted-foreground))] border border-[rgb(var(--border))] hover:text-[rgb(var(--foreground))]'
                          }`}
                        >
                          +{d} ngày
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="text-xs text-[rgb(var(--muted-foreground))] font-medium pt-1">
                    🗓️ Hạn thanh toán công nợ: <strong className="text-amber-500 font-bold">{new Date(new Date(purchaseDate).getTime() + (Number(debtDays) || 0) * 86400000).toLocaleDateString('vi-VN')}</strong> (Tự động cộng <span className="underline">{debtDays || 0} ngày</span> từ Ngày nhập hàng <span className="underline">{new Date(purchaseDate).toLocaleDateString('vi-VN')}</span>)
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-[rgb(var(--foreground))]">Chọn ngày hạn chót:</span>
                    <input
                      type="date"
                      required={remainingDebt > 0}
                      value={calendarDueDate}
                      onChange={(e) => setCalendarDueDate(e.target.value)}
                      className="px-3 py-2 rounded-xl text-sm font-semibold bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  {calendarDueDate && (
                    <div className="text-xs text-[rgb(var(--muted-foreground))] font-medium">
                      🗓️ Hạn chót đã chọn: <strong className="text-amber-500 font-bold">{new Date(calendarDueDate).toLocaleDateString('vi-VN')}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/purchases')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--accent))]"
          >
            Hủy Bỏ
          </button>

          <button
            type="button"
            onClick={() => handleSubmitForm(true)}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Lưu tạm phiếu nhập để chỉnh sửa tiếp bất kỳ lúc nào"
          >
            <BookmarkPlus className="w-4 h-4" />
            <span>Lưu Tạm Phiếu Nhập</span>
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50"
          >
            {submitting ? 'Đang lưu...' : id ? 'Xác Nhận Duyệt & Nhập Kho' : 'Xác Nhận Tạo Phiếu Nhập Hàng'}
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
      {/* Inline Quick Add Master Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-2xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[rgb(var(--border))] bg-[rgb(var(--muted))/30] shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[rgb(var(--foreground))]">
                    Thêm Mã Sản Phẩm Mới (Master Catalog)
                  </h3>
                  <p className="text-xs text-[rgb(var(--muted-foreground))]">
                    Tạo mã định danh linh kiện để nhập kho ngay trong phiếu nhập
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="p-1.5 rounded-lg text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--accent))]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleQuickAddProduct} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                  Tên Linh Kiện / Sản Phẩm *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: RAM Corsair Vengeance LPX 16GB DDR4 3200MHz..."
                  value={newProdData.name}
                  onChange={(e) => setNewProdData({ ...newProdData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                    Danh Mục Linh Kiện *
                  </label>
                  <select
                    value={newProdData.category}
                    onChange={(e) => setNewProdData({ ...newProdData, category: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value={ProductCategory.CPU}>CPU (Vi xử lý)</option>
                    <option value={ProductCategory.MAINBOARD}>Mainboard (Bo mạch)</option>
                    <option value={ProductCategory.RAM}>RAM (Bộ nhớ)</option>
                    <option value={ProductCategory.SSD}>SSD (Ổ cứng thể rắn)</option>
                    <option value={ProductCategory.HDD}>HDD (Ổ cứng cơ)</option>
                    <option value={ProductCategory.VGA}>VGA (Card màn hình)</option>
                    <option value={ProductCategory.PSU}>PSU (Nguồn máy tính)</option>
                    <option value={ProductCategory.CASE}>Case (Vỏ máy tính)</option>
                    <option value={ProductCategory.COOLER}>Cooler (Tản nhiệt)</option>
                    <option value={ProductCategory.MONITOR}>Monitor (Màn hình)</option>
                    <option value={ProductCategory.ACCESSORY}>Phụ kiện</option>
                    <option value={ProductCategory.LAPTOP}>Laptop</option>
                    <option value={ProductCategory.PC}>PC Nguyên bộ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                    Thương Hiệu / Hãng *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Intel, ASUS, Corsair..."
                    value={newProdData.brand}
                    onChange={(e) => setNewProdData({ ...newProdData, brand: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                    Model / Mã Kiểu *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: CMK16GX4M1E3200C16..."
                    value={newProdData.model}
                    onChange={(e) => setNewProdData({ ...newProdData, model: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                  Mô Tả / Ghi Chú Linh Kiện
                </label>
                <textarea
                  rows={2}
                  placeholder="Nhập thông tin mô tả chi tiết linh kiện..."
                  value={newProdData.description}
                  onChange={(e) => setNewProdData({ ...newProdData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Specs Section Toggle */}
              <div className="pt-2 border-t border-[rgb(var(--border))] space-y-3">
                <button
                  type="button"
                  onClick={() => setShowAllSpecs(!showAllSpecs)}
                  className="text-xs font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  <span>{showAllSpecs ? 'Thu gọn Thông số kỹ thuật (Specs)' : '+ Mở rộng Thông số kỹ thuật (Specs)'}</span>
                </button>

                {showAllSpecs && (
                  <div className="p-4 rounded-xl bg-[rgb(var(--muted))/20] border border-[rgb(var(--border))] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-medium text-[rgb(var(--muted-foreground))] mb-1">CPU Spec</label>
                      <input
                        type="text"
                        placeholder="VD: Core i7-13700K..."
                        value={newProdData.specs.cpu}
                        onChange={(e) => setNewProdData({ ...newProdData, specs: { ...newProdData.specs, cpu: e.target.value } })}
                        className="w-full px-3 py-1.5 rounded-lg bg-[rgb(var(--background))] border border-[rgb(var(--border))]"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-[rgb(var(--muted-foreground))] mb-1">RAM Spec</label>
                      <input
                        type="text"
                        placeholder="VD: 16GB DDR4 3200MHz..."
                        value={newProdData.specs.ram}
                        onChange={(e) => setNewProdData({ ...newProdData, specs: { ...newProdData.specs, ram: e.target.value } })}
                        className="w-full px-3 py-1.5 rounded-lg bg-[rgb(var(--background))] border border-[rgb(var(--border))]"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-[rgb(var(--muted-foreground))] mb-1">VGA Spec</label>
                      <input
                        type="text"
                        placeholder="VD: RTX 4070 12GB..."
                        value={newProdData.specs.vga}
                        onChange={(e) => setNewProdData({ ...newProdData, specs: { ...newProdData.specs, vga: e.target.value } })}
                        className="w-full px-3 py-1.5 rounded-lg bg-[rgb(var(--background))] border border-[rgb(var(--border))]"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-[rgb(var(--muted-foreground))] mb-1">SSD / Storage Spec</label>
                      <input
                        type="text"
                        placeholder="VD: 1TB NVMe Gen4..."
                        value={newProdData.specs.ssd}
                        onChange={(e) => setNewProdData({ ...newProdData, specs: { ...newProdData.specs, ssd: e.target.value } })}
                        className="w-full px-3 py-1.5 rounded-lg bg-[rgb(var(--background))] border border-[rgb(var(--border))]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgb(var(--border))] shrink-0">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--accent))]"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={creatingProduct}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-500 hover:to-blue-500 shadow-md shadow-indigo-500/20 disabled:opacity-50"
                >
                  {creatingProduct ? 'Đang tạo...' : 'Lưu & Chọn Ngay Cho Phiếu Nhập'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
