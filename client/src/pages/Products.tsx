import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn, debounce } from '@/lib/utils';
import { useProductStore } from '@/store/productStore';
import { ProductCategory } from '@/types';
import type { Product } from '@/types';
import {
  Search, Plus, Grid3X3, List, Filter, Copy,
  Trash2, Edit, Package, ChevronLeft, ChevronRight,
  MoreHorizontal, X, Warehouse,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function Products() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    products, totalProducts, totalPages, currentPage, loading,
    viewMode, searchQuery, filters,
    setViewMode, setSearchQuery, setFilters, setCurrentPage, fetchProducts,
    deleteProduct, cloneProduct,
  } = useProductStore();

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [showFilters, setShowFilters] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearchQuery(value);
    }, 300),
    []
  );

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) setFilters({ category: cat });
    fetchProducts();
  }, [currentPage, searchQuery, filters]);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    debouncedSearch(value);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa Mã sản phẩm master này?')) return;
    try {
      await deleteProduct(id);
      toast.success('Đã xóa Mã sản phẩm');
    } catch {
      toast.error('Không thể xóa Mã sản phẩm');
    }
  };

  const handleClone = async (id: string) => {
    try {
      await cloneProduct(id);
      toast.success('Đã nhân bản Mã sản phẩm');
    } catch {
      toast.error('Không thể nhân bản');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Danh Mục Mã Sản Phẩm (Master Catalog)</h1>
          <p className="text-sm text-[rgb(var(--muted-foreground))] mt-1">
            {totalProducts} mã sản phẩm định danh linh kiện trong hệ thống
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/inventory')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[rgb(var(--border))] text-sm font-medium hover:bg-[rgb(var(--accent))] transition-smooth"
          >
            <Warehouse className="w-4 h-4 text-blue-500" />
            Đến Trang Nhập Kho
          </button>
          <button
            onClick={() => navigate('/products/new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-medium hover:opacity-90 transition-smooth shadow-lg shadow-blue-500/25"
          >
            <Plus className="w-4 h-4" />
            Tạo Mã Sản Phẩm Mới
          </button>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted-foreground))]" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Tìm theo tên linh kiện, mã SP, CPU, RAM, SSD, VGA, thương hiệu..."
            className={cn(
              'w-full pl-10 pr-4 py-2.5 rounded-xl text-sm',
              'bg-[rgb(var(--muted))] border border-[rgb(var(--border))]',
              'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50',
              'placeholder:text-[rgb(var(--muted-foreground))] transition-smooth'
            )}
          />
          {localSearch && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border transition-smooth',
            showFilters
              ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
              : 'bg-[rgb(var(--card))] text-[rgb(var(--muted-foreground))] border-[rgb(var(--border))] hover:border-blue-500/30'
          )}
        >
          <Filter className="w-4 h-4" />
          Bộ lọc
        </button>

        <div className="flex items-center border border-[rgb(var(--border))] rounded-xl overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2.5 transition-smooth',
              viewMode === 'grid' ? 'bg-blue-500/10 text-blue-500' : 'text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--accent))]'
            )}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-2.5 transition-smooth',
              viewMode === 'list' ? 'bg-blue-500/10 text-blue-500' : 'text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--accent))]'
            )}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] animate-slide-in-up">
          <select
            value={filters.category || ''}
            onChange={(e) => setFilters({ category: e.target.value || undefined })}
            className="px-3 py-2 rounded-lg text-sm bg-[rgb(var(--muted))] border border-[rgb(var(--border))] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="">Tất cả danh mục</option>
            {Object.values(ProductCategory).map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <button
            onClick={() => setFilters({ category: undefined, brand: undefined })}
            className="px-3 py-2 rounded-lg text-sm text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] transition-smooth"
          >
            Xóa bộ lọc
          </button>
        </div>
      )}

      {/* Products Grid/List */}
      {loading ? (
        <div className={cn(
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
            : 'space-y-3'
        )}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
              <div className="skeleton w-full h-40 mb-3 rounded-xl" />
              <div className="skeleton w-3/4 h-4 mb-2" />
              <div className="skeleton w-1/2 h-3" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-[rgb(var(--muted-foreground))]">
          <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Chưa có Mã sản phẩm nào</p>
          <p className="text-sm mt-1">Bấm "Tạo Mã Sản Phẩm Mới" để tạo mã đầu tiên</p>
          <button
            onClick={() => navigate('/products/new')}
            className="mt-4 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-smooth"
          >
            + Tạo Mã Sản Phẩm Mới
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product, i) => (
            <ProductCard
              key={product._id}
              product={product}
              index={i}
              onEdit={() => navigate(`/products/${product._id}`)}
              onClone={() => handleClone(product._id)}
              onDelete={() => handleDelete(product._id)}
              activeMenu={activeMenu}
              setActiveMenu={setActiveMenu}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((product, i) => (
            <ProductListItem
              key={product._id}
              product={product}
              index={i}
              onEdit={() => navigate(`/products/${product._id}`)}
              onClone={() => handleClone(product._id)}
              onDelete={() => handleDelete(product._id)}
              activeMenu={activeMenu}
              setActiveMenu={setActiveMenu}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-2 rounded-lg disabled:opacity-30 hover:bg-[rgb(var(--accent))] transition-smooth"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const page = i + 1;
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={cn(
                  'w-9 h-9 rounded-lg text-sm font-medium transition-smooth',
                  currentPage === page
                    ? 'bg-blue-500 text-white'
                    : 'hover:bg-[rgb(var(--accent))] text-[rgb(var(--muted-foreground))]'
                )}
              >
                {page}
              </button>
            );
          })}
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-2 rounded-lg disabled:opacity-30 hover:bg-[rgb(var(--accent))] transition-smooth"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function ProductCard({
  product, index, onEdit, onClone, onDelete,
  activeMenu, setActiveMenu,
}: {
  product: Product; index: number;
  onEdit: () => void; onClone: () => void;
  onDelete: () => void;
  activeMenu: string | null; setActiveMenu: (id: string | null) => void;
}) {
  return (
    <div
      className={cn(
        'group relative rounded-2xl border overflow-hidden transition-smooth',
        'bg-[rgb(var(--card))] border-[rgb(var(--border))]',
        'hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5',
        'animate-slide-in-up'
      )}
      style={{ animationDelay: `${index * 0.05}s`, opacity: 0 }}
    >
      <div className="relative aspect-[4/3] bg-[rgb(var(--muted))] overflow-hidden cursor-pointer" onClick={onEdit}>
        {product.images?.[0]?.url ? (
          <img
            src={product.images[0].url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-[rgb(var(--muted-foreground))] opacity-30" />
          </div>
        )}
        <div className="absolute top-3 left-3 px-2 py-1 rounded-lg text-[10px] font-semibold bg-blue-500 text-white">
          {product.category}
        </div>
      </div>

      <div className="p-4">
        <h3
          className="text-sm font-semibold line-clamp-1 cursor-pointer hover:text-blue-500 transition-smooth"
          onClick={onEdit}
        >
          {product.name}
        </h3>
        <p className="text-xs text-[rgb(var(--muted-foreground))] mt-0.5 font-mono">{product.productCode}</p>
        <p className="text-xs text-[rgb(var(--muted-foreground))] mt-1">
          Thương hiệu: <strong className="text-[rgb(var(--foreground))]">{product.brand}</strong> • Model: {product.model}
        </p>

        <div className="flex items-center justify-end mt-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === product._id ? null : product._id)}
              className="p-1.5 rounded-lg hover:bg-[rgb(var(--accent))] transition-smooth"
            >
              <MoreHorizontal className="w-4 h-4 text-[rgb(var(--muted-foreground))]" />
            </button>
            {activeMenu === product._id && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                <div className={cn(
                  'absolute right-0 bottom-full mb-1 w-44 rounded-xl border shadow-xl z-20 py-1',
                  'bg-[rgb(var(--card))] border-[rgb(var(--border))]',
                  'animate-scale-in'
                )}>
                  <MenuItem icon={Edit} label="Sửa Mã SP" onClick={() => { onEdit(); setActiveMenu(null); }} />
                  <MenuItem icon={Copy} label="Nhân bản" onClick={() => { onClone(); setActiveMenu(null); }} />
                  <hr className="my-1 border-[rgb(var(--border))]" />
                  <MenuItem icon={Trash2} label="Xóa" danger onClick={() => { onDelete(); setActiveMenu(null); }} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductListItem({
  product, index, onEdit, onClone, onDelete,
  activeMenu, setActiveMenu,
}: {
  product: Product; index: number;
  onEdit: () => void; onClone: () => void; onDelete: () => void;
  activeMenu: string | null; setActiveMenu: (id: string | null) => void;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 rounded-2xl border transition-smooth cursor-pointer',
        'bg-[rgb(var(--card))] border-[rgb(var(--border))]',
        'hover:border-blue-500/30 hover:shadow-lg',
        'animate-fade-in'
      )}
      style={{ animationDelay: `${index * 0.03}s`, opacity: 0 }}
      onClick={onEdit}
    >
      <div className="w-16 h-16 rounded-xl bg-[rgb(var(--muted))] overflow-hidden flex-shrink-0">
        {product.images?.[0]?.url ? (
          <img src={product.images[0].url} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-6 h-6 text-[rgb(var(--muted-foreground))] opacity-30" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold truncate">{product.name}</h3>
        <p className="text-xs text-[rgb(var(--muted-foreground))]">
          Mã: <span className="font-mono text-blue-500">{product.productCode}</span> • {product.brand} {product.model}
        </p>
      </div>

      <div className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
        {product.category}
      </div>

      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => setActiveMenu(activeMenu === product._id ? null : product._id)}
          className="p-1.5 rounded-lg hover:bg-[rgb(var(--accent))] transition-smooth"
        >
          <MoreHorizontal className="w-4 h-4 text-[rgb(var(--muted-foreground))]" />
        </button>
      </div>
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger = false }: { icon: any; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 w-full px-3 py-2 text-sm transition-smooth',
        danger
          ? 'text-red-500 hover:bg-red-500/10'
          : 'text-[rgb(var(--foreground))] hover:bg-[rgb(var(--accent))]'
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}
