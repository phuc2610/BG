import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn, formatCurrency } from '@/lib/utils';
import type { DashboardStats, InventoryItem } from '@/types';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  Package, Warehouse, Laptop, Cpu, MemoryStick, HardDrive,
  Gamepad2, CircuitBoard, Plug, Box, Monitor, TrendingUp,
  ShoppingCart, Plus, DollarSign, Wallet, ArrowUpRight,
  Users, Truck, Calendar, Clock, Filter, BarChart3,
} from 'lucide-react';

const categoryConfig: { key: string; label: string; icon: any; gradient: string }[] = [
  { key: 'CPU', label: 'CPU', icon: Cpu, gradient: 'from-orange-500 to-amber-400' },
  { key: 'RAM', label: 'RAM', icon: MemoryStick, gradient: 'from-green-500 to-emerald-400' },
  { key: 'SSD', label: 'SSD', icon: HardDrive, gradient: 'from-pink-500 to-rose-400' },
  { key: 'VGA', label: 'VGA', icon: Gamepad2, gradient: 'from-red-500 to-orange-400' },
  { key: 'Mainboard', label: 'Mainboard', icon: CircuitBoard, gradient: 'from-teal-500 to-cyan-400' },
  { key: 'PSU', label: 'PSU', icon: Plug, gradient: 'from-yellow-500 to-amber-400' },
  { key: 'Case', label: 'Case', icon: Box, gradient: 'from-indigo-500 to-blue-400' },
  { key: 'Màn hình', label: 'Màn hình', icon: Monitor, gradient: 'from-fuchsia-500 to-pink-400' },
  { key: 'Laptop', label: 'Laptop', icon: Laptop, gradient: 'from-violet-500 to-purple-400' },
];

type DatePreset = 'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM';

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'ALL', label: 'Tất cả thời gian' },
  { key: 'TODAY', label: 'Hôm nay' },
  { key: 'YESTERDAY', label: 'Hôm qua' },
  { key: 'THIS_MONTH', label: 'Tháng này' },
  { key: 'LAST_MONTH', label: 'Tháng trước' },
  { key: 'CUSTOM', label: 'Tùy chọn...' },
];

export function Dashboard() {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentInventory, setRecentInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Date Filter State for Profit & Revenue
  const [datePreset, setDatePreset] = useState<DatePreset>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const getPresetDateRange = useCallback((preset: DatePreset, customStart?: string, customEnd?: string) => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    if (preset === 'TODAY') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (preset === 'YESTERDAY') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      start = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 0, 0, 0, 0);
      end = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 23, 59, 59, 999);
    } else if (preset === 'THIS_MONTH') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (preset === 'LAST_MONTH') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (preset === 'CUSTOM') {
      if (customStart) start = new Date(`${customStart}T00:00:00.000`);
      if (customEnd) end = new Date(`${customEnd}T23:59:59.999`);
    }

    return {
      startDate: start ? start.toISOString() : undefined,
      endDate: end ? end.toISOString() : undefined,
    };
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getPresetDateRange(datePreset, customStartDate, customEndDate);
      const [statsRes, recentRes] = await Promise.all([
        api.get('/dashboard/stats', { params: { startDate, endDate } }),
        api.get('/inventory?limit=8&inStockOnly=true'),
      ]);
      setStats(statsRes.data.data);
      setRecentInventory(recentRes.data.data);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [datePreset, customStartDate, customEndDate, getPresetDateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getPeriodLabel = () => {
    const now = new Date();
    if (datePreset === 'ALL') return 'Toàn thời gian';
    if (datePreset === 'TODAY') return `Hôm nay (${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()})`;
    if (datePreset === 'YESTERDAY') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      return `Hôm qua (${yest.getDate()}/${yest.getMonth() + 1}/${yest.getFullYear()})`;
    }
    if (datePreset === 'THIS_MONTH') return `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;
    if (datePreset === 'LAST_MONTH') {
      const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
      const lastYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return `Tháng ${lastMonth}/${lastYear}`;
    }
    if (datePreset === 'CUSTOM') {
      return customStartDate || customEndDate
        ? `${customStartDate || '...'} đến ${customEndDate || '...'}`
        : 'Tùy chọn';
    }
    return '';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Title */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Quản Lý Cửa Hàng</h1>
          <p className="text-sm text-[rgb(var(--muted-foreground))] mt-1">
            Tổng quan danh mục sản phẩm, kho linh kiện & lợi nhuận kinh doanh
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
          {hasPermission('product.create') && (
            <button
              onClick={() => navigate('/products/new')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[rgb(var(--border))] text-sm font-medium hover:bg-[rgb(var(--accent))] transition-smooth"
            >
              <Plus className="w-4 h-4 text-blue-500" />
              <span className="hidden sm:inline">Tạo Mã SP Mới</span>
              <span className="sm:hidden">Tạo SP</span>
            </button>
          )}
          {hasPermission('purchase.create') && (
            <button
              onClick={() => navigate('/purchases')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-medium hover:opacity-90 transition-smooth shadow-lg shadow-blue-500/25"
            >
              <Warehouse className="w-4 h-4" />
              <span className="hidden sm:inline">Nhập Hàng</span>
            </button>
          )}
        </div>
      </div>

      {/* Date Filter Toolbar for Revenue & Profit */}
      <div className="p-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] space-y-3 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-500" />
            <h2 className="text-sm font-bold text-[rgb(var(--foreground))]">Xem Lợi Nhuận & Doanh Thu Theo Thời Gian</h2>
          </div>
          <span className="text-xs text-blue-500 font-bold px-3 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20">
            Kỳ báo cáo: {getPeriodLabel()}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setDatePreset(p.key)}
              className={cn(
                'px-3 py-1.5 rounded-xl font-semibold transition-all',
                datePreset === p.key
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-[rgb(var(--muted))] border border-[rgb(var(--border))] text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {datePreset === 'CUSTOM' && (
          <div className="flex items-center gap-3 pt-2 border-t border-[rgb(var(--border))] flex-wrap text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[rgb(var(--muted-foreground))] font-medium">Từ ngày:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[rgb(var(--muted))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[rgb(var(--muted-foreground))] font-medium">Đến ngày:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[rgb(var(--muted))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Financial Profit Stats (Revenue - Cost = Profit) */}
      {(hasPermission('dashboard.revenue') || hasPermission('dashboard.inventory_value') || hasPermission('dashboard.profit')) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-[rgb(var(--muted-foreground))] uppercase tracking-wider">
              Thống kê tài chính ({getPeriodLabel()})
            </h2>
            {stats?.profitMargin !== undefined && stats.profitMargin > 0 && (
              <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg">
                Tỷ suất lợi nhuận: {stats.profitMargin}%
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {hasPermission('dashboard.revenue') && (
              <FinancialStatCard
                label="Tổng doanh thu bán ra"
                value={formatCurrency(stats?.totalRevenue || 0)}
                subtitle={`Doanh thu từ ${stats?.totalFinalizedInvoices || 0} HĐ chốt (${getPeriodLabel()})`}
                icon={DollarSign}
                gradient="from-blue-500 to-cyan-500"
                loading={loading}
              />
            )}
            {hasPermission('dashboard.inventory_value') && (
              <FinancialStatCard
                label="Tổng giá vốn kho (Còn Tồn)"
                value={formatCurrency(stats?.totalStockValuation || 0)}
                subtitle="Tổng tiền nhập cho linh kiện đang tồn"
                icon={Wallet}
                gradient="from-amber-500 to-orange-500"
                loading={loading}
              />
            )}
            {hasPermission('dashboard.profit') && (
              <FinancialStatCard
                label="Tiền lời (Lợi nhuận gộp)"
                value={formatCurrency(stats?.totalProfit || 0)}
                subtitle={`Lợi nhuận thực tế (${getPeriodLabel()})`}
                badge={stats?.profitMargin !== undefined ? `Margin: ${stats.profitMargin}%` : undefined}
                icon={ArrowUpRight}
                gradient="from-emerald-500 to-teal-500"
                highlight
                loading={loading}
              />
            )}
          </div>
        </div>
      )}


      {/* Debt & Store Management Stats */}
      <div>
        <h2 className="text-xs font-bold text-[rgb(var(--muted-foreground))] uppercase tracking-wider mb-3">
          Thống kê công nợ & vận hành cửa hàng
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {hasPermission('dashboard.customer_debt') && (
            <FinancialStatCard
              label="Tổng công nợ khách hàng"
              value={formatCurrency(stats?.totalCustomerDebt || 0)}
              subtitle="Số tiền khách hàng còn nợ"
              icon={Users}
              gradient="from-purple-500 to-indigo-500"
              loading={loading}
            />
          )}
          {hasPermission('dashboard.supplier_debt') && (
            <FinancialStatCard
              label="Tổng công nợ nhà cung cấp"
              value={formatCurrency(stats?.totalSupplierDebt || 0)}
              subtitle="Số tiền còn nợ nhà cung cấp"
              icon={Truck}
              gradient="from-rose-500 to-pink-500"
              loading={loading}
            />
          )}
          <StatCard
            label="Hóa đơn bán hàng đã chốt"
            value={stats?.totalFinalizedInvoices || 0}
            icon={ShoppingCart}
            gradient="from-blue-500 to-violet-600"
            loading={loading}
          />
          <StatCard
            label="Số lượng linh kiện khả dụng"
            value={stats?.totalInStockCount || 0}
            icon={Warehouse}
            gradient="from-emerald-500 to-teal-500"
            loading={loading}
          />
        </div>
      </div>

      {/* Category Stats */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Danh mục tồn kho sản phẩm</h2>
            <p className="text-xs text-[rgb(var(--muted-foreground))]">Số lượng sản phẩm còn tồn kho theo từng danh mục</p>
          </div>
          <button
            onClick={() => navigate('/inventory')}
            className="text-sm text-blue-500 hover:text-blue-400 transition-smooth font-medium"
          >
            Xem toàn bộ kho tồn →
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {categoryConfig.map((cat, i) => {
            const inStockQty = stats?.byCategory?.[cat.key] || 0;

            return (
              <button
                key={cat.key}
                onClick={() => navigate(`/inventory?category=${encodeURIComponent(cat.key)}`)}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-2xl border transition-all duration-200 cursor-pointer',
                  'bg-[rgb(var(--card))] border-[rgb(var(--border))]',
                  'hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 hover:scale-[1.02]',
                  'animate-fade-in text-left'
                )}
                title={`Bấm để xem tồn kho lọc theo danh mục ${cat.label} (Còn tồn: ${inStockQty})`}
                style={{ animationDelay: `${i * 0.04}s`, opacity: 0 }}
              >
                <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-md', cat.gradient)}>
                  <cat.icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-xs text-[rgb(var(--muted-foreground))] truncate">{cat.label}</p>
                  <p className="text-lg font-bold text-[rgb(var(--foreground))]">
                    {loading ? '—' : inStockQty}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Inventory Stock Lots */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Linh kiện mới nhập kho</h2>
          <button
            onClick={() => navigate('/inventory')}
            className="text-sm text-blue-500 hover:text-blue-400 transition-smooth"
          >
            Xem toàn bộ kho →
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
                <div className="skeleton w-full h-40 mb-3 rounded-xl" />
                <div className="skeleton w-3/4 h-4 mb-2" />
                <div className="skeleton w-1/2 h-3 mb-3" />
              </div>
            ))}
          </div>
        ) : recentInventory.length === 0 ? (
          <div className="text-center py-16 text-[rgb(var(--muted-foreground))]">
            <Warehouse className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Chưa có linh kiện nào trong kho</p>
            <button
              onClick={() => navigate('/inventory')}
              className="mt-3 text-sm text-blue-500 hover:text-blue-400 font-medium"
            >
              Tạo lô nhập kho đầu tiên →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {recentInventory.map((item, i) => {
              const product = item.product;
              return (
                <div
                  key={item._id}
                  onClick={() => navigate('/inventory')}
                  className={cn(
                    'group rounded-2xl border overflow-hidden cursor-pointer transition-smooth',
                    'bg-[rgb(var(--card))] border-[rgb(var(--border))]',
                    'hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5',
                    'animate-slide-in-up'
                  )}
                  style={{ animationDelay: `${i * 0.05}s`, opacity: 0 }}
                >
                  <div className="relative aspect-[4/3] bg-[rgb(var(--muted))] overflow-hidden">
                    {product?.images?.[0]?.url ? (
                      <img
                        src={product.images[0].url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[rgb(var(--muted-foreground))]">
                        <Package className="w-10 h-10 opacity-30" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3 px-2 py-1 rounded-lg text-[10px] font-semibold bg-blue-500 text-white shadow-md">
                      {item.condition}
                    </div>
                    <div className="absolute bottom-3 left-3 px-2.5 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-white text-[10px] font-medium">
                      SL Tồn: {item.quantity}
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="text-sm font-semibold line-clamp-1 group-hover:text-blue-500 transition-smooth">
                      {product?.name || 'Mã SP đã xóa'}
                    </h3>
                    <p className="text-xs text-[rgb(var(--muted-foreground))] mt-0.5 font-mono">
                      {product?.productCode} • Mã kho: {item.stockCode}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[rgb(var(--border))]">
                      <p className="text-xs text-[rgb(var(--muted-foreground))]">Giá vốn nhập:</p>
                      <p className="text-sm font-bold text-blue-500">
                        {formatCurrency(item.costPrice)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FinancialStatCard({
  label, value, subtitle, badge, icon: Icon, gradient, highlight = false, loading,
}: {
  label: string; value: string; subtitle: string; badge?: string; icon: any; gradient: string; highlight?: boolean; loading: boolean;
}) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl border p-5 transition-smooth',
      highlight ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/30' : 'bg-[rgb(var(--card))] border-[rgb(var(--border))]',
      'hover:shadow-lg'
    )}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-[rgb(var(--muted-foreground))] font-medium">{label}</p>
            {badge && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
                {badge}
              </span>
            )}
          </div>
          {loading ? (
            <div className="skeleton w-28 h-8 mt-1" />
          ) : (
            <p className={cn('text-2xl font-bold mt-1 tracking-tight', highlight && 'text-emerald-500')}>{value}</p>
          )}
          <p className="text-[10px] text-[rgb(var(--muted-foreground))] mt-1">{subtitle}</p>
        </div>
        <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0', gradient)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}


function StatCard({
  label, value, icon: Icon, gradient, loading,
}: {
  label: string; value: number; icon: any; gradient: string; loading: boolean;
}) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl border p-5 transition-smooth',
      'bg-[rgb(var(--card))] border-[rgb(var(--border))]',
      'hover:shadow-lg'
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[rgb(var(--muted-foreground))] font-medium">{label}</p>
          {loading ? (
            <div className="skeleton w-16 h-8 mt-1" />
          ) : (
            <p className="text-3xl font-bold mt-1 tracking-tight">{value.toLocaleString()}</p>
          )}
        </div>
        <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center', gradient)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}
