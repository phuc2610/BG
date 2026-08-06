import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Warehouse,
  Search,
  Filter,
  Package,
  Layers,
  ChevronRight,
  X,
  ShieldCheck,
  Calendar,
  Building2,
  DollarSign,
  Edit,
  Tag,
  Eye,
  Edit2,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import api from '@/lib/api';
import { ProductCategory, ProductCondition } from '@/types';
import type { InventoryGroupedProduct, InventoryUnitRecord } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export function Inventory() {
  const navigate = useNavigate();
  const [groupedProducts, setGroupedProducts] = useState<InventoryGroupedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Selected Product for Serial Detail Drawer
  const [selectedProduct, setSelectedProduct] = useState<InventoryGroupedProduct | null>(null);
  const [unitList, setUnitList] = useState<InventoryUnitRecord[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Warranty Filter in Drawer
  const [drawerWarrantyFilter, setDrawerWarrantyFilter] = useState<'all' | 'NORMAL' | 'DUE_SOON' | 'EXPIRED'>('all');

  // Inline edit List Price
  const [editingListPriceId, setEditingListPriceId] = useState<string | null>(null);
  const [tempListPrice, setTempListPrice] = useState<number>(0);
  const [savingListPrice, setSavingListPrice] = useState(false);

  const handleSaveListPrice = async (unitId: string) => {
    try {
      setSavingListPrice(true);
      await api.patch(`/inventory-units/${unitId}/list-price`, { listPrice: tempListPrice });
      toast.success('Đã cập nhật Giá Niêm Yết thành công');
      setEditingListPriceId(null);
      if (selectedProduct) {
        handleOpenDrawer(selectedProduct);
      }
    } catch (err: any) {
      toast.error('Không thể cập nhật Giá Niêm Yết');
    } finally {
      setSavingListPrice(false);
    }
  };

  const fetchGroupedInventory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory-units/grouped', {
        params: {
          search,
          category: categoryFilter === 'all' ? undefined : categoryFilter,
        },
      });

      if (res.data.success) {
        setGroupedProducts(res.data.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể tải danh sách tồn kho');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupedInventory();
  }, [search, categoryFilter]);

  const handleOpenDrawer = async (prod: InventoryGroupedProduct) => {
    setSelectedProduct(prod);
    try {
      setLoadingUnits(true);
      const res = await api.get(`/inventory-units/by-product/${prod.productId}`);
      if (res.data.success) {
        setUnitList(res.data.data);
      }
    } catch (err: any) {
      toast.error('Không thể tải danh sách Serial của sản phẩm');
    } finally {
      setLoadingUnits(false);
    }
  };

  const filteredUnits = unitList.filter((u) => {
    if (drawerWarrantyFilter === 'all') return true;
    return u.warrantyStatus === drawerWarrantyFilter;
  });

  const totalStockValuation = groupedProducts.reduce((sum, p) => sum + p.totalStockValue, 0);
  const totalStockListValuation = groupedProducts.reduce((sum, p) => sum + (p.totalStockListValue || 0), 0);
  const totalAvailableStockCount = groupedProducts.reduce((sum, p) => sum + p.availableStock, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[rgb(var(--foreground))]">
            Quản Lý Tồn Kho (Gộp Theo Mã SP)
          </h1>
          <p className="text-sm text-[rgb(var(--muted-foreground))] mt-1">
            Hiển thị tổng hợp theo mã sản phẩm chung. Click sản phẩm để xem danh sách từng Serial vật lý
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/purchases/new')}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 transition-all duration-200"
          >
            + Nhập Hàng Vào Kho
          </button>
        </div>
      </div>

      {/* Top Valuation Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm space-y-1">
          <div className="text-xs font-semibold text-blue-500 uppercase">Tổng Mã Sản Phẩm Tồn Kho</div>
          <div className="text-2xl font-bold text-[rgb(var(--foreground))]">
            {groupedProducts.length} <span className="text-xs font-normal text-[rgb(var(--muted-foreground))]">mã SP</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm space-y-1">
          <div className="text-xs font-semibold text-emerald-500 uppercase">Tổng Thiết Bị Sẵn Sàng (Available)</div>
          <div className="text-2xl font-bold text-emerald-500">
            {totalAvailableStockCount} <span className="text-xs font-normal text-[rgb(var(--muted-foreground))]">thiết bị / Serial</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm space-y-1">
          <div className="text-xs font-semibold text-indigo-500 uppercase">Tổng Giá Trị Kho (Giá Nhập)</div>
          <div className="text-2xl font-bold text-indigo-500">
            {formatCurrency(totalStockValuation)}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm space-y-1">
          <div className="text-xs font-semibold text-purple-500 uppercase">Tổng Giá Trị Niêm Yết</div>
          <div className="text-2xl font-bold text-purple-500">
            {formatCurrency(totalStockListValuation)}
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))]">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[rgb(var(--muted-foreground))]" />
          <input
            type="text"
            placeholder="Tìm theo Mã SP, Tên SP, Thương hiệu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
          >
            <option value="all">-- Tất cả danh mục --</option>
            {Object.values(ProductCategory).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grouped Inventory Table */}
      <div className="rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-sm text-[rgb(var(--muted-foreground))]">
            Đang tải dữ liệu tổng hợp kho...
          </div>
        ) : groupedProducts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Warehouse className="w-12 h-12 text-[rgb(var(--muted-foreground))] mx-auto stroke-1" />
            <div className="text-base font-semibold text-[rgb(var(--foreground))]">
              Không có sản phẩm nào trong kho
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[rgb(var(--muted))/50] text-[rgb(var(--muted-foreground))] text-xs font-semibold uppercase border-b border-[rgb(var(--border))]">
                <tr>
                  <th className="px-5 py-3.5">Mã SP</th>
                  <th className="px-5 py-3.5">Tên Sản Phẩm</th>
                  <th className="px-5 py-3.5">Danh Mục</th>
                  <th className="px-5 py-3.5 text-center">Tồn Khả Dụng</th>
                  <th className="px-5 py-3.5 text-center">Đang Giữ (HĐ)</th>
                  <th className="px-5 py-3.5 text-center">Đã Bán</th>
                  <th className="px-5 py-3.5 text-right">Giá Nhập Mới Nhất</th>
                  <th className="px-5 py-3.5 text-right">Tổng Giá Trị Kho</th>
                  <th className="px-5 py-3.5 text-center">Chi Tiết Serial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--border))]">
                {groupedProducts.map((p) => (
                  <tr
                    key={p.productId}
                    onClick={() => handleOpenDrawer(p)}
                    className="hover:bg-[rgb(var(--accent))/50] cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-4 font-mono font-bold text-xs text-blue-500">
                      {p.productCode}
                    </td>
                    <td className="px-5 py-4 font-semibold text-[rgb(var(--foreground))]">
                      {p.productName}
                    </td>
                    <td className="px-5 py-4 text-xs text-[rgb(var(--muted-foreground))]">
                      {p.category}
                    </td>
                    <td className="px-5 py-4 text-center font-bold text-emerald-500">
                      {p.availableStock}
                    </td>
                    <td className="px-5 py-4 text-center font-semibold text-amber-500">
                      {p.reservedStock}
                    </td>
                    <td className="px-5 py-4 text-center text-xs text-[rgb(var(--muted-foreground))]">
                      {p.soldStock}
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-[rgb(var(--foreground))]">
                      {formatCurrency(p.latestCostPrice)}
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-indigo-500">
                      {formatCurrency(p.totalStockValue)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDrawer(p);
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 inline-flex items-center gap-1 transition-colors"
                      >
                        <span>Xem Serial</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Serial Detail Drawer / Slide-Over */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="bg-[rgb(var(--card))] border-l border-[rgb(var(--border))] w-full max-w-4xl h-full flex flex-col shadow-2xl animate-fade-in">
            {/* Drawer Header */}
            <div className="p-6 border-b border-[rgb(var(--border))] flex items-center justify-between bg-[rgb(var(--muted))/30]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-500 font-bold">
                    {selectedProduct.productCode}
                  </span>
                  <h3 className="font-bold text-lg text-[rgb(var(--foreground))]">
                    {selectedProduct.productName}
                  </h3>
                </div>
                <p className="text-xs text-[rgb(var(--muted-foreground))] mt-1">
                  Danh sách {unitList.length} thiết bị thực tế thuộc mã sản phẩm này
                </p>
              </div>

              <button
                onClick={() => setSelectedProduct(null)}
                className="p-2 rounded-xl text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--accent))]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Filter */}
            <div className="p-4 border-b border-[rgb(var(--border))] bg-[rgb(var(--background))] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[rgb(var(--muted-foreground))]">
                  Lọc Bảo Hành NCC:
                </span>
                {(['all', 'NORMAL', 'DUE_SOON', 'EXPIRED'] as const).map((wb) => (
                  <button
                    key={wb}
                    onClick={() => setDrawerWarrantyFilter(wb)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      drawerWarrantyFilter === wb
                        ? 'bg-blue-500/10 text-blue-500 border-blue-500/30 font-semibold'
                        : 'bg-[rgb(var(--card))] text-[rgb(var(--muted-foreground))] border-[rgb(var(--border))]'
                    }`}
                  >
                    {wb === 'all'
                      ? 'Tất cả'
                      : wb === 'NORMAL'
                      ? 'Còn BH (>30d)'
                      : wb === 'DUE_SOON'
                      ? 'Sắp hết BH (<=30d)'
                      : 'Hết BH'}
                  </button>
                ))}
              </div>
            </div>

            {/* Drawer Body Table */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingUnits ? (
                <div className="p-12 text-center text-sm text-[rgb(var(--muted-foreground))]">
                  Đang tải danh sách Serial...
                </div>
              ) : filteredUnits.length === 0 ? (
                <div className="p-12 text-center text-sm text-[rgb(var(--muted-foreground))]">
                  Không có Serial nào khớp với bộ lọc
                </div>
              ) : (
                <div className="rounded-xl border border-[rgb(var(--border))] overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[rgb(var(--muted))/50] text-[rgb(var(--muted-foreground))] font-semibold uppercase border-b border-[rgb(var(--border))]">
                      <tr>
                        <th className="px-4 py-3">Serial Number</th>
                        <th className="px-4 py-3">Nhà Cung Cấp</th>
                        <th className="px-4 py-3">Ngày Nhập</th>
                        <th className="px-4 py-3 text-right">Giá Nhập</th>
                        <th className="px-4 py-3 text-right">Giá Niêm Yết</th>
                        <th className="px-4 py-3">Bảo Hành NCC</th>
                        <th className="px-4 py-3 text-center">Trạng Thái Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgb(var(--border))]">
                      {filteredUnits.map((u) => (
                        <tr key={u._id} className="hover:bg-[rgb(var(--accent))/30]">
                          <td className="px-4 py-3 font-mono font-bold text-blue-500">
                            {u.serialNumber || <span className="text-[rgb(var(--muted-foreground))] italic">Không có Serial</span>}
                          </td>
                          <td className="px-4 py-3 text-[rgb(var(--foreground))]">
                            {u.supplierName || 'NCC N/A'}
                          </td>
                          <td className="px-4 py-3 text-[rgb(var(--muted-foreground))]">
                            {formatDate(u.purchaseDate)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-[rgb(var(--foreground))]">
                            {formatCurrency(u.purchasePrice)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {editingListPriceId === u._id ? (
                              <div className="flex items-center justify-end gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  value={tempListPrice}
                                  onChange={(e) => setTempListPrice(Number(e.target.value))}
                                  className="w-24 px-2 py-1 text-xs rounded bg-[rgb(var(--background))] border border-emerald-500 text-emerald-500 font-bold focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  disabled={savingListPrice}
                                  onClick={() => handleSaveListPrice(u._id)}
                                  className="px-2 py-1 text-[10px] rounded bg-emerald-500 text-white font-bold hover:bg-emerald-600"
                                >
                                  Lưu
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingListPriceId(null)}
                                  className="px-1.5 py-1 text-[10px] rounded bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))]"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingListPriceId(u._id);
                                  setTempListPrice(u.listPrice || u.purchasePrice || 0);
                                }}
                                className="font-bold text-emerald-500 hover:underline inline-flex items-center gap-1 group"
                                title="Click để chỉnh sửa Giá Niêm Yết"
                              >
                                <span>{formatCurrency(u.listPrice || u.purchasePrice || 0)}</span>
                                <Edit className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div>{u.supplierWarrantyMonths} tháng</div>
                            <div className="mt-0.5">
                              {u.warrantyStatus === 'EXPIRED' ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-500/10 text-red-500 font-bold">
                                  Hết BH (0 ngày)
                                </span>
                              ) : u.warrantyStatus === 'DUE_SOON' ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 font-bold">
                                  Còn {u.remainingWarrantyDays} ngày
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 font-semibold">
                                  Còn {u.remainingWarrantyDays} ngày
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full font-semibold ${
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
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
