import { useState, useEffect, useMemo, useRef } from 'react';
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
  Sparkles,
  Loader2,
  FileSpreadsheet,
  Copy,
  ShieldCheck,
  Search,
  Layers,
  LayoutGrid,
  CheckSquare,
  Square,
  AlertTriangle,
  Wand2,
  ScanLine,
} from 'lucide-react';
import api from '@/lib/api';
import { ProductCondition, ProductCategory } from '@/types';
import type { SupplierRecord } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { ProductAiImagePicker } from '@/components/shared/ProductAiImagePicker';
import { SupplierSearchSelect } from '@/components/shared/SupplierSearchSelect';
import { PurchaseItemRow, type PurchaseItemData } from '@/components/purchase/PurchaseItemRow';
import { PurchaseExcelPasteModal } from '@/components/purchase/PurchaseExcelPasteModal';
import { PurchaseBatchWarrantyModal } from '@/components/purchase/PurchaseBatchWarrantyModal';
import { PurchaseBulkSerialModal } from '@/components/purchase/PurchaseBulkSerialModal';
import { WarrantyLookupModal } from '@/components/warranty/WarrantyLookupModal';

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
  const [debtDays, setDebtDays] = useState<number>(30);
  const [dueMode, setDueMode] = useState<'days' | 'calendar'>('days');
  const [calendarDueDate, setCalendarDueDate] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Items State
  const [items, setItems] = useState<PurchaseItemData[]>([
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

  // UI Interactive States
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [searchItemText, setSearchItemText] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'uncompleted'>('all');
  const [isCompact, setIsCompact] = useState(true);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [showBatchWarrantyModal, setShowBatchWarrantyModal] = useState(false);
  const [showBulkSerialModal, setShowBulkSerialModal] = useState(false);
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);
  const [warrantyModalSerial, setWarrantyModalSerial] = useState<string | undefined>(undefined);
  const [warrantyModalBrand, setWarrantyModalBrand] = useState<string | undefined>(undefined);

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
  const [suggestingQuickSpecs, setSuggestingQuickSpecs] = useState(false);
  const [newProdData, setNewProdData] = useState({
    name: '',
    category: ProductCategory.CPU,
    brand: '',
    model: '',
    description: '',
    imageUrl: '',
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

  const handleAiSuggestQuickSpecs = async () => {
    if (!newProdData.name.trim()) {
      toast.error('Vui lòng nhập Tên linh kiện trước khi yêu cầu Gemini gợi ý thông số!');
      return;
    }

    setSuggestingQuickSpecs(true);
    try {
      const res = await api.post('/ai/suggest-specs', {
        name: newProdData.name.trim(),
        category: newProdData.category,
      });
      if (res.data.success && res.data.data) {
        const d = res.data.data;
        setNewProdData((prev) => {
          const cleanedSpecs = { ...prev.specs } as any;
          if (d.specs && typeof d.specs === 'object') {
            Object.entries(d.specs).forEach(([k, v]) => {
              if (v !== null && v !== undefined && String(v).trim()) {
                cleanedSpecs[k] = String(v).trim();
              }
            });
          }
          return {
            ...prev,
            brand: d.brand || prev.brand,
            model: d.model || prev.model,
            description: d.description || prev.description,
            specs: cleanedSpecs,
          };
        });
        setShowAllSpecs(true);
        toast.success('✨ Google Gemini đã tự động điền Thông số & Hãng!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi gợi ý thông số từ Gemini');
    } finally {
      setSuggestingQuickSpecs(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [supRes, prodRes] = await Promise.all([
          api.get('/suppliers', { params: { limit: 500 } }),
          api.get('/products', { params: { limit: 2000 } }),
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
      const cleanedSpecs: Record<string, string> = {};
      if (newProdData.specs && typeof newProdData.specs === 'object') {
        Object.entries(newProdData.specs).forEach(([k, v]) => {
          if (v !== null && v !== undefined && String(v).trim()) {
            cleanedSpecs[k] = String(v).trim();
          }
        });
      }

      const payload = {
        name: newProdData.name.trim(),
        category: newProdData.category,
        brand: newProdData.brand.trim(),
        model: newProdData.model.trim(),
        description: newProdData.description ? newProdData.description.trim() : undefined,
        imageUrl: newProdData.imageUrl ? newProdData.imageUrl.trim() : undefined,
        specs: cleanedSpecs,
      };

      const res = await api.post('/products', payload);
      if (res.data.success) {
        const createdProd = res.data.data;
        toast.success(`Đã tạo mã sản phẩm mới: [${createdProd.productCode}] ${createdProd.name}`);

        setProducts((prev) => [createdProd, ...prev]);

        if (targetItemIndex !== null && targetItemIndex >= 0 && targetItemIndex < items.length) {
          handleProductSelect(targetItemIndex, getPid(createdProd));
        }

        setShowProductModal(false);
        setNewProdData({
          name: '',
          category: ProductCategory.CPU,
          brand: '',
          model: '',
          description: '',
          imageUrl: '',
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
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể tạo mã sản phẩm');
    } finally {
      setCreatingProduct(false);
    }
  };

  const getPid = (p: any) =>
    typeof p?._id === 'string'
      ? p._id
      : p?._id?.toString() || p?.id || String(p?._id || '');

  const handleProductSelect = (index: number, pId: string, selectedProd?: any) => {
    const prod = selectedProd || products.find((p) => getPid(p) === pId);
    if (selectedProd && !products.some((p) => getPid(p) === pId)) {
      setProducts((prev) => [selectedProd, ...prev]);
    }
    const updated = [...items];
    if (prod) {
      updated[index] = {
        ...updated[index],
        productId: getPid(prod),
        productName: prod.name,
        productCode: prod.productCode,
        listPrice: prod.sellingPrice > 0 ? prod.sellingPrice : updated[index].listPrice,
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
    setItems((prev) => [
      ...prev,
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
    setItems((prev) => prev.filter((_, i) => i !== index));
    setSelectedIndices((prev) => {
      const next = new Set<number>();
      prev.forEach((idx) => {
        if (idx < index) next.add(idx);
        else if (idx > index) next.add(idx - 1);
      });
      return next;
    });
  };

  // Multi-select & Batch Actions
  const handleSelectRow = (index: number, selected: boolean) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (selected) next.add(index);
      else next.delete(index);
      return next;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const all = new Set(items.map((_, i) => i));
      setSelectedIndices(all);
    } else {
      setSelectedIndices(new Set());
    }
  };

  const handleDuplicateSelected = () => {
    if (selectedIndices.size === 0) return;
    const clones: PurchaseItemData[] = [];
    items.forEach((it, idx) => {
      if (selectedIndices.has(idx)) {
        clones.push({
          ...it,
          serialsRaw: '', // Reset serials for duplicate rows
        });
      }
    });
    setItems((prev) => [...prev, ...clones]);
    setSelectedIndices(new Set());
    toast.success(`Đã nhân đôi ${clones.length} dòng linh kiện!`);
  };

  const handleDeleteSelected = () => {
    if (selectedIndices.size === 0) return;
    if (items.length === selectedIndices.size) {
      // Keep 1 empty row if deleting all
      setItems([
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
    } else {
      setItems((prev) => prev.filter((_, i) => !selectedIndices.has(i)));
    }
    setSelectedIndices(new Set());
    toast.success('Đã xóa các dòng đã chọn!');
  };

  const handleApplyBatchWarranty = (value: number, unit: 'day' | 'month' | 'year') => {
    if (selectedIndices.size === 0) return;
    setItems((prev) =>
      prev.map((it, idx) => {
        if (selectedIndices.has(idx)) {
          return {
            ...it,
            supplierWarrantyValue: value,
            supplierWarrantyUnit: unit,
          };
        }
        return it;
      })
    );
    toast.success(`Đã cập nhật bảo hành ${value} ${unit === 'month' ? 'tháng' : unit === 'year' ? 'năm' : 'ngày'} cho ${selectedIndices.size} dòng!`);
  };

  const handleImportExcelRows = (imported: PurchaseItemData[]) => {
    // If the first row is empty, replace it, otherwise append
    if (items.length === 1 && !items[0].productId && !items[0].costPrice) {
      setItems(imported);
    } else {
      setItems((prev) => [...prev, ...imported]);
    }
    toast.success(`Đã nhập thành công ${imported.length} dòng từ Excel!`);
  };

  // Global serial tracking across all rows to detect cross-row duplicates
  const globalSerialMap = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((it) => {
      const serials = (it.serialsRaw || '')
        .split(/[\n,;\t]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 0);
      serials.forEach((sn) => {
        map.set(sn, (map.get(sn) || 0) + 1);
      });
    });
    return map;
  }, [items]);

  // Validation helper for each item
  const checkItemUncompleted = (it: PurchaseItemData) => {
    if (!it.productId) return true;
    if (Number(it.quantity) <= 0) return true;
    const serialList = (it.serialsRaw || '')
      .split(/[\n,;\t]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (serialList.length > 0 && serialList.length !== Number(it.quantity)) return true;

    // Check for internal duplicates
    const set = new Set(serialList.map((s) => s.toLowerCase()));
    if (set.size !== serialList.length) return true;

    // Check for cross-row duplicates
    for (const sn of serialList) {
      if ((globalSerialMap.get(sn.toLowerCase()) || 0) > 1) return true;
    }

    return false;
  };

  // Calculate totals and uncompleted counts
  const totalAmount = useMemo(
    () => items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.costPrice) || 0), 0),
    [items]
  );
  const totalQuantity = useMemo(
    () => items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0),
    [items]
  );
  const totalSerials = useMemo(() => {
    return items.reduce((sum, it) => {
      const count = (it.serialsRaw || '')
        .split(/[\n,;\t]+/)
        .filter((s) => s.trim().length > 0).length;
      return sum + count;
    }, 0);
  }, [items]);

  const uncompletedCount = useMemo(() => {
    return items.filter(checkItemUncompleted).length;
  }, [items, globalSerialMap]);

  const remainingDebt = Math.max(0, totalAmount - (Number(paidAmount) || 0));

  // Filtered items based on search and tab
  const visibleItems = useMemo(() => {
    return items
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(({ item }) => {
        // Tab filter
        if (filterTab === 'uncompleted' && !checkItemUncompleted(item)) {
          return false;
        }

        // Search text filter
        if (searchItemText.trim()) {
          const term = searchItemText.toLowerCase().trim();
          const code = (item.productCode || '').toLowerCase();
          const name = (item.productName || '').toLowerCase();
          const serials = (item.serialsRaw || '').toLowerCase();
          return code.includes(term) || name.includes(term) || serials.includes(term);
        }

        return true;
      });
  }, [items, filterTab, searchItemText, globalSerialMap]);

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
          setFilterTab('uncompleted');
          toast.error(`Mục ${i + 1}: Vui lòng chọn sản phẩm`);
          document.getElementById(`purchase-item-row-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        if (it.quantity <= 0) {
          setFilterTab('uncompleted');
          toast.error(`Mục ${i + 1}: Số lượng phải lớn hơn 0`);
          document.getElementById(`purchase-item-row-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }

        const serialList = (it.serialsRaw || '')
          .split(/[\n,;\t]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        if (serialList.length > 0 && serialList.length !== Number(it.quantity)) {
          setFilterTab('uncompleted');
          toast.error(
            `Mục ${i + 1} (${it.productName || 'Sản phẩm'}): Đã nhập ${serialList.length} Serial nhưng số lượng là ${it.quantity}. Vui lòng kiểm tra lại!`
          );
          document.getElementById(`purchase-item-row-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

  const isAllVisibleSelected =
    visibleItems.length > 0 && visibleItems.every(({ originalIndex }) => selectedIndices.has(originalIndex));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* Top Navigation Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/purchases')}
            className="p-2.5 rounded-xl border border-[rgb(var(--border))] text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] hover:bg-[rgb(var(--accent))] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[rgb(var(--foreground))]">
              {id ? 'Chỉnh Sửa Phiếu Nhập Hàng' : 'Tạo Phiếu Nhập Hàng Mới'}
            </h1>
            <p className="hidden sm:block text-sm text-[rgb(var(--muted-foreground))] mt-0.5">
              Nhập linh kiện vật lý theo Serial Number từ Nhà cung cấp
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => saveDraft(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[rgb(var(--card))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] hover:bg-[rgb(var(--accent))] flex items-center gap-1.5 transition-colors shadow-sm"
            title="Lưu bản nháp để tiếp tục sau"
          >
            <BookmarkPlus className="w-4 h-4 text-amber-400" />
            <span>Lưu Nháp</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Draft Recovery Banner */}
        {hasDraft && (
          <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/10 flex items-center justify-between flex-wrap gap-3 animate-in fade-in-50">
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
                <span>Khôi Phục Nháp</span>
              </button>
              <button
                type="button"
                onClick={clearDraft}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-[rgb(var(--muted-foreground))] hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Bỏ Qua
              </button>
            </div>
          </div>
        )}

        {/* Supplier & General Information Section */}
        <div className="p-6 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm space-y-4 relative z-30">
          <div className="flex items-center justify-between border-b border-[rgb(var(--border))] pb-3">
            <h3 className="font-bold text-base text-[rgb(var(--foreground))] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-500" />
              Thông Tin Nhà Cung Cấp & Phiếu Nhập
            </h3>
            <button
              type="button"
              onClick={() => setShowSupplierModal(true)}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
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
              <SupplierSearchSelect
                suppliers={suppliers}
                value={supplierId}
                onChange={setSupplierId}
                onAddNew={() => setShowSupplierModal(true)}
                required
              />
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

        {/* Refactored Products & Serials Section */}
        <div className="rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm flex flex-col relative">
          {/* Section Toolbar Header */}
          <div className="p-4 border-b border-[rgb(var(--border))] bg-[rgb(var(--muted))/20] rounded-t-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base text-[rgb(var(--foreground))]">
                  Danh Sách Sản Phẩm & Serial
                </h3>
              </div>

              {/* Segmented Filter Control: All / Uncompleted */}
              <div className="flex items-center p-0.5 rounded-xl bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  className={cn(
                    'px-3 py-1 rounded-lg transition-all flex items-center gap-1.5',
                    filterTab === 'all'
                      ? 'bg-indigo-600 text-white shadow-sm font-bold'
                      : 'text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]'
                  )}
                >
                  <span>Tất cả</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">
                    {items.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterTab('uncompleted')}
                  className={cn(
                    'px-3 py-1 rounded-lg transition-all flex items-center gap-1.5',
                    filterTab === 'uncompleted'
                      ? 'bg-amber-600 text-white shadow-sm font-bold'
                      : 'text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]'
                  )}
                >
                  <span>Chưa xong</span>
                  {uncompletedCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500 text-white font-mono font-bold animate-pulse">
                      {uncompletedCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Density Toggle (Thoáng / Gọn) */}
              <button
                type="button"
                onClick={() => setIsCompact(!isCompact)}
                className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] hidden sm:flex items-center gap-1 transition-colors"
                title="Chuyển đổi mật độ dòng hiển thị"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{isCompact ? 'Gọn' : 'Thoáng'}</span>
              </button>
            </div>

            {/* Top Right Action Buttons */}
            <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end flex-wrap">
              {/* Search within items list */}
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--muted-foreground))]" />
                <input
                  type="text"
                  placeholder="Lọc trong phiếu..."
                  value={searchItemText}
                  onChange={(e) => setSearchItemText(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl text-xs bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] focus:outline-none focus:border-indigo-500"
                />
                {searchItemText && (
                  <button
                    type="button"
                    onClick={() => setSearchItemText('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowBulkSerialModal(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Sinh số Serial tự động hàng loạt cho các dòng linh kiện"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Sinh SN Hàng Loạt</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowExcelModal(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Dán nhanh nhiều dòng từ Excel hoặc Google Sheets"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Dán từ Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setWarrantyModalSerial('');
                    setWarrantyModalBrand('');
                    setShowWarrantyModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20 flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Quét tem nhãn OCR hoặc tra cứu bảo hành nhà cung cấp"
                >
                  <ScanLine className="w-3.5 h-3.5" />
                  <span>Tra Cứu BH (OCR)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTargetItemIndex(items.length - 1);
                    setShowProductModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo Mã Catalog</span>
                </button>

                <button
                  type="button"
                  onClick={addItemRow}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 flex items-center gap-1 transition-colors shadow-md shadow-blue-500/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Dòng</span>
                </button>
              </div>
            </div>
          </div>

          {/* Floating Batch Actions Bar (Visible when rows are selected) */}
          {selectedIndices.size > 0 && (
            <div className="px-4 py-2.5 bg-indigo-600/15 border-b border-indigo-500/30 flex items-center justify-between flex-wrap gap-2 text-xs animate-in fade-in-50">
              <div className="flex items-center gap-2 font-bold text-indigo-300">
                <CheckSquare className="w-4 h-4 text-indigo-400" />
                <span>Đã chọn {selectedIndices.size} dòng</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowBulkSerialModal(true)}
                  className="px-3 py-1 rounded-lg font-bold bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 flex items-center gap-1 transition-colors shadow-sm"
                >
                  <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Sinh SN ({selectedIndices.size})</span>
                </button>

                <button
                  type="button"
                  onClick={handleDuplicateSelected}
                  className="px-3 py-1 rounded-lg font-bold bg-[rgb(var(--card))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] hover:bg-[rgb(var(--accent))] flex items-center gap-1 transition-colors shadow-sm"
                >
                  <Copy className="w-3.5 h-3.5 text-blue-400" />
                  <span>Nhân đôi ({selectedIndices.size})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowBatchWarrantyModal(true)}
                  className="px-3 py-1 rounded-lg font-bold bg-[rgb(var(--card))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] hover:bg-[rgb(var(--accent))] flex items-center gap-1 transition-colors shadow-sm"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Đặt bảo hành hàng loạt</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="px-3 py-1 rounded-lg font-bold bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa đã chọn ({selectedIndices.size})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedIndices(new Set())}
                  className="p-1 rounded-lg text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]"
                  title="Bỏ chọn tất cả"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Sticky Desktop Table Header (>= 820px) */}
          <div className="hidden md:grid grid-cols-[32px_32px_minmax(220px,1fr)_75px_120px_120px_125px_120px_90px_36px] items-center gap-2 px-3.5 py-2.5 bg-[rgb(var(--muted))/40] text-[rgb(var(--muted-foreground))] font-bold text-xs sticky top-0 z-20 border-b border-[rgb(var(--border))] select-none">
            {/* Checkbox Header */}
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                checked={isAllVisibleSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                title="Chọn tất cả các dòng đang hiển thị"
              />
            </div>

            <div className="text-center">STT</div>
            <div>Sản Phẩm & Linh Kiện</div>
            <div className="text-center">Số Lượng</div>
            <div className="text-right">Giá Nhập (₫)</div>
            <div className="text-right">Giá Niêm Yết (₫)</div>
            <div className="text-center">Bảo Hành NCC</div>
            <div className="text-right">Thành Tiền</div>
            <div className="text-center">Serial</div>
            <div className="text-center">Xóa</div>
          </div>

          {/* Table Body / Rows List */}
          <div className="divide-y divide-[rgb(var(--border))]">
            {visibleItems.length === 0 ? (
              <div className="p-12 text-center text-xs text-[rgb(var(--muted-foreground))] space-y-2">
                <Package className="w-8 h-8 mx-auto opacity-30" />
                <p>
                  {filterTab === 'uncompleted'
                    ? '🎉 Tuyệt vời! Tất cả các dòng sản phẩm đã hoàn thành đầy đủ thông tin.'
                    : 'Không tìm thấy dòng sản phẩm nào khớp với tìm kiếm.'}
                </p>
                {filterTab === 'uncompleted' && (
                  <button
                    type="button"
                    onClick={() => setFilterTab('all')}
                    className="text-indigo-400 font-bold hover:underline"
                  >
                    Xem toàn bộ danh sách ({items.length})
                  </button>
                )}
              </div>
            ) : (
              visibleItems.map(({ item, originalIndex }) => (
                <PurchaseItemRow
                  key={originalIndex}
                  index={originalIndex}
                  item={item}
                  products={products}
                  isSelected={selectedIndices.has(originalIndex)}
                  isCompact={isCompact}
                  canRemove={items.length > 1}
                  purchaseDate={purchaseDate}
                  globalSerialSet={globalSerialMap}
                  onSelectRow={(selected) => handleSelectRow(originalIndex, selected)}
                  onChangeField={(field, val) => handleItemChange(originalIndex, field, val)}
                  onSelectProduct={(pId, prod) => handleProductSelect(originalIndex, pId, prod)}
                  onRemove={() => removeItemRow(originalIndex)}
                  onOpenProductModal={() => {
                    setTargetItemIndex(originalIndex);
                    setShowProductModal(true);
                  }}
                  onEnterPressAtEnd={() => {
                    if (originalIndex === items.length - 1) {
                      addItemRow();
                    }
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* Payment & Supplier Debt Section */}
        <div className="p-6 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm space-y-4">
          <h3 className="font-bold text-base text-[rgb(var(--foreground))] flex items-center gap-2 border-b border-[rgb(var(--border))] pb-3">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Thanh Toán Cho Nhà Cung Cấp & Công Nợ
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[rgb(var(--muted))/30] space-y-1">
              <div className="text-xs text-[rgb(var(--muted-foreground))]">Tổng Giá Trị Phiếu Nhập:</div>
              <div className="text-xl font-bold font-mono text-[rgb(var(--foreground))]">
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
                value={paidAmount === 0 ? '' : paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-3 py-2.5 rounded-xl text-sm font-bold font-mono bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[rgb(var(--foreground))] mb-1">
                Còn Nợ NCC (Tự động tính)
              </label>
              <div className="w-full px-3 py-2.5 rounded-xl text-sm font-bold font-mono bg-[rgb(var(--muted))/30] text-amber-400">
                {formatCurrency(remainingDebt)}
              </div>
            </div>
          </div>

          {remainingDebt > 0 && (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wide">
                  <AlertCircle className="w-4 h-4" />
                  Thời Hạn Thanh Toán Công Nợ NCC
                </div>

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
                        className="w-24 px-3 py-2 rounded-xl text-sm font-bold font-mono bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-amber-400 focus:outline-none focus:border-amber-500 text-center"
                        placeholder="Số ngày..."
                      />
                      <span className="text-xs font-semibold text-[rgb(var(--muted-foreground))]">ngày</span>
                    </div>

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
                    🗓️ Hạn thanh toán công nợ: <strong className="text-amber-400 font-bold">{new Date(new Date(purchaseDate).getTime() + (Number(debtDays) || 0) * 86400000).toLocaleDateString('vi-VN')}</strong> (Tự động cộng <span className="underline">{debtDays || 0} ngày</span> từ Ngày nhập hàng <span className="underline">{new Date(purchaseDate).toLocaleDateString('vi-VN')}</span>)
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
                      🗓️ Hạn chót đã chọn: <strong className="text-amber-400 font-bold">{new Date(calendarDueDate).toLocaleDateString('vi-VN')}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Summary Footer Bar (Dính Đáy Form) */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[rgb(var(--card))/95] backdrop-blur-md border-t border-[rgb(var(--border))] shadow-2xl px-4 py-3 animate-in fade-in-50">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Left Metrics & Warnings */}
            <div className="flex items-center gap-3 flex-wrap text-xs">
              <div className="flex items-center gap-2 bg-[rgb(var(--muted))/40] px-3 py-1.5 rounded-xl border border-[rgb(var(--border))]">
                <span className="text-[rgb(var(--muted-foreground))]">Tổng dòng:</span>
                <span className="font-bold font-mono text-[rgb(var(--foreground))]">{items.length}</span>
              </div>

              <div className="flex items-center gap-2 bg-[rgb(var(--muted))/40] px-3 py-1.5 rounded-xl border border-[rgb(var(--border))]">
                <span className="text-[rgb(var(--muted-foreground))]">Tổng SL:</span>
                <span className="font-bold font-mono text-blue-400">{totalQuantity}</span>
              </div>

              <div className="flex items-center gap-2 bg-[rgb(var(--muted))/40] px-3 py-1.5 rounded-xl border border-[rgb(var(--border))]">
                <span className="text-[rgb(var(--muted-foreground))]">Serial đã nhập:</span>
                <span className="font-bold font-mono text-indigo-400">{totalSerials}/{totalQuantity}</span>
              </div>

              <div className="flex items-center gap-2 bg-[rgb(var(--muted))/40] px-3 py-1.5 rounded-xl border border-[rgb(var(--border))]">
                <span className="text-[rgb(var(--muted-foreground))]">Tổng tiền:</span>
                <span className="font-bold font-mono text-emerald-400 text-sm">{formatCurrency(totalAmount)}</span>
              </div>

              {uncompletedCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterTab('uncompleted');
                    const firstErrorIdx = items.findIndex(checkItemUncompleted);
                    if (firstErrorIdx !== -1) {
                      document.getElementById(`purchase-item-row-${firstErrorIdx}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors animate-pulse"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{uncompletedCount} dòng chưa xong</span>
                </button>
              )}
            </div>

            {/* Right Submit Buttons */}
            <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={() => navigate('/purchases')}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--accent))] transition-colors"
              >
                Hủy Bỏ
              </button>

              <button
                type="button"
                onClick={() => handleSubmitForm(true)}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                title="Lưu tạm phiếu nhập để chỉnh sửa tiếp bất kỳ lúc nào"
              >
                <BookmarkPlus className="w-4 h-4" />
                <span>Lưu Tạm</span>
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{submitting ? 'Đang lưu...' : id ? 'Xác Nhận Duyệt & Nhập Kho' : 'Xác Nhận Tạo Phiếu Nhập Hàng'}</span>
              </button>
            </div>
          </div>
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

            <form onSubmit={handleQuickAddProduct} noValidate className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[rgb(var(--foreground))]">
                    Tên Linh Kiện / Sản Phẩm *
                  </label>
                  <button
                    type="button"
                    onClick={handleAiSuggestQuickSpecs}
                    disabled={suggestingQuickSpecs}
                    className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    {suggestingQuickSpecs ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                    )}
                    <span>{suggestingQuickSpecs ? 'Đang phân tích Gemini...' : '✨ AI Gợi ý Specs (Gemini)'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  name="productName"
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
                    name="productCategory"
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
                    name="productBrand"
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
                    name="productModel"
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
                  Ảnh Đại Diện Linh Kiện & Tạo Ảnh Tự Động AI
                </label>
                <ProductAiImagePicker
                  imageUrl={newProdData.imageUrl}
                  onChange={(url) => setNewProdData((prev) => ({ ...prev, imageUrl: url }))}
                  productName={newProdData.name}
                  category={newProdData.category}
                  brand={newProdData.brand}
                  model={newProdData.model}
                  compact={true}
                />
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

              <div className="pt-2 border-t border-[rgb(var(--border))] space-y-3">
                <button
                  type="button"
                  onClick={() => setShowAllSpecs(!showAllSpecs)}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5"
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

      {/* Excel Bulk Paste Modal */}
      <PurchaseExcelPasteModal
        isOpen={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        products={products}
        onImport={handleImportExcelRows}
      />

      {/* Batch Warranty Modal */}
      <PurchaseBatchWarrantyModal
        isOpen={showBatchWarrantyModal}
        onClose={() => setShowBatchWarrantyModal(false)}
        selectedCount={selectedIndices.size}
        onApply={handleApplyBatchWarranty}
      />

      {/* Bulk Serial Generation Modal */}
      <PurchaseBulkSerialModal
        isOpen={showBulkSerialModal}
        onClose={() => setShowBulkSerialModal(false)}
        items={items}
        selectedIndices={selectedIndices}
        purchaseDate={purchaseDate}
        onApply={(updated) => {
          setItems(updated);
          toast.success('✨ Đã sinh và cập nhật Serial hàng loạt thành công!');
        }}
      />

      {/* Warranty Lookup / OCR Modal */}
      <WarrantyLookupModal
        isOpen={showWarrantyModal}
        onClose={() => setShowWarrantyModal(false)}
        initialSerial={warrantyModalSerial}
        initialBrand={warrantyModalBrand}
        onApplyWarranty={(info) => {
          // Auto add a new item row with extracted S/N and warranty
          const newItem: PurchaseItemData = {
            productId: '',
            productName: info.supplierName ? `Linh kiện (${info.supplierName})` : 'Linh kiện mới',
            productCode: '',
            quantity: 1,
            costPrice: 0,
            listPrice: 0,
            condition: ProductCondition.LIKE_NEW,
            supplierWarrantyValue: info.remainingDays ? Math.max(1, Math.round(info.remainingDays / 30)) : 12,
            supplierWarrantyUnit: 'month',
            serialsRaw: info.serialNumber,
          };
          setItems((prev) => [...prev, newItem]);
          toast.success(`✓ Đã thêm linh kiện S/N: ${info.serialNumber} vào danh sách nhập!`);
        }}
      />
    </div>
  );
}
