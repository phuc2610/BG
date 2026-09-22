import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Plus, Package, Loader2 } from 'lucide-react';
import { cn, removeVietnameseTones } from '@/lib/utils';
import api from '@/lib/api';

interface ProductSearchSelectProps {
  products: any[];
  value: string;
  onChange: (productId: string, product?: any) => void;
  placeholder?: string;
  onAddNew?: () => void;
  required?: boolean;
  onSelectAndFocusNext?: () => void;
  onProductsFound?: (products: any[]) => void;
}

export function ProductSearchSelect({
  products,
  value,
  onChange,
  placeholder = '-- Tìm & Chọn sản phẩm --',
  onAddNew,
  required = false,
  onSelectAndFocusNext,
  onProductsFound,
}: ProductSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [remoteProducts, setRemoteProducts] = useState<any[]>([]);
  const [isSearchingServer, setIsSearchingServer] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Helper to get string ID
  const getPid = (p: any) =>
    typeof p?._id === 'string'
      ? p._id
      : p?._id?.toString() || p?.id || String(p?._id || '');

  // Merge products from props and remote search results
  const allProducts = useMemo(() => {
    if (remoteProducts.length === 0) return products;
    const map = new Map<string, any>();
    products.forEach((p) => map.set(getPid(p), p));
    remoteProducts.forEach((p) => {
      const id = getPid(p);
      if (!map.has(id)) {
        map.set(id, p);
      }
    });
    return Array.from(map.values());
  }, [products, remoteProducts]);

  // Currently selected product
  const selectedProduct = allProducts.find((p) => getPid(p) === value);

  // Filter products locally by search term (code, name, brand, category, model, barcode)
  // Accent-insensitive and multi-token matching
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return allProducts;

    const rawTerm = searchTerm.toLowerCase().trim();
    const normTerm = removeVietnameseTones(rawTerm);
    const searchTokens = normTerm.split(/\s+/).filter(Boolean);

    return allProducts.filter((p) => {
      const code = (p.productCode || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      const normName = removeVietnameseTones(name);
      const brand = (typeof p.brand === 'object' ? p.brand?.name : p.brand || '').toLowerCase();
      const normBrand = removeVietnameseTones(brand);
      const category = (p.category || '').toLowerCase();
      const normCat = removeVietnameseTones(category);
      const model = (p.modelName || p.model || '').toLowerCase();
      const normModel = removeVietnameseTones(model);
      const barcode = (p.barcode || '').toLowerCase();

      // Combined searchable text (both original lowercase and diacritic-free lowercase)
      const fullText = `${code} ${normName} ${name} ${normBrand} ${brand} ${normCat} ${category} ${normModel} ${model} ${barcode}`;

      // All search tokens must match somewhere in the attributes
      return searchTokens.every((token) => fullText.includes(token));
    });
  }, [allProducts, searchTerm]);

  // Remote server search fallback with 250ms debounce
  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed || trimmed.length < 2) return;

    const timer = setTimeout(async () => {
      try {
        setIsSearchingServer(true);
        const res = await api.get('/products', {
          params: {
            search: trimmed,
            limit: 50,
          },
        });
        if (res.data?.success && Array.isArray(res.data?.data)) {
          const found = res.data.data;
          if (found.length > 0) {
            setRemoteProducts((prev) => {
              const map = new Map<string, any>();
              prev.forEach((p) => map.set(getPid(p), p));
              found.forEach((p: any) => map.set(getPid(p), p));
              return Array.from(map.values());
            });
            if (onProductsFound) {
              onProductsFound(found);
            }
          }
        }
      } catch (err) {
        console.error('Lỗi tìm kiếm sản phẩm trên máy chủ:', err);
      } finally {
        setIsSearchingServer(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm, onProductsFound]);

  // Reset activeIndex when filter changes
  useEffect(() => {
    setActiveIndex(0);
  }, [searchTerm]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto focus search input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (product: any) => {
    const pId = getPid(product);
    onChange(pId, product);
    setIsOpen(false);
    setSearchTerm('');
    if (onSelectAndFocusNext) {
      setTimeout(() => onSelectAndFocusNext(), 50);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', null);
    setSearchTerm('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % Math.max(1, filteredProducts.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + filteredProducts.length) % Math.max(1, filteredProducts.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProducts.length > 0 && activeIndex >= 0 && activeIndex < filteredProducts.length) {
        handleSelect(filteredProducts[activeIndex]);
      }
    }
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', isOpen && 'z-50')}>
      {/* Target trigger box */}
      <div
        ref={triggerRef}
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full px-3 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border transition-all cursor-pointer flex items-center justify-between gap-2 select-none min-h-[38px] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500',
          isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
            : 'border-[rgb(var(--border))] hover:border-indigo-500/50',
          !selectedProduct && required && 'border-red-500/50'
        )}
      >
        {selectedProduct ? (
          <div className="flex items-center gap-2 overflow-hidden truncate">
            <span className="px-1.5 py-0.5 rounded text-[11px] font-bold font-mono bg-blue-500/10 text-blue-500 border border-blue-500/20 shrink-0">
              {selectedProduct.productCode}
            </span>
            <span className="font-semibold text-[rgb(var(--foreground))] truncate">
              {selectedProduct.name}
            </span>
            {(selectedProduct.modelName || selectedProduct.model) && (
              <span className="text-[11px] text-indigo-400 shrink-0 font-medium font-mono hidden sm:inline">
                [{selectedProduct.modelName || selectedProduct.model}]
              </span>
            )}
            {selectedProduct.brand && (
              <span className="text-[11px] text-[rgb(var(--muted-foreground))] shrink-0 font-medium">
                ({typeof selectedProduct.brand === 'object' ? selectedProduct.brand?.name : selectedProduct.brand})
              </span>
            )}
          </div>
        ) : (
          <span className="text-[rgb(var(--muted-foreground))] flex items-center gap-2 text-sm">
            <Search className="w-4 h-4 opacity-50" />
            {placeholder}
          </span>
        )}

        <div className="flex items-center gap-1 shrink-0 text-[rgb(var(--muted-foreground))]">
          {selectedProduct && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-[rgb(var(--accent))] hover:text-[rgb(var(--foreground))] transition-colors"
              title="Xóa lựa chọn"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', isOpen && 'rotate-180 text-indigo-500')} />
        </div>
      </div>

      {/* Hidden input to pass HTML form validation if required */}
      {required && (
        <input
          type="text"
          value={value}
          onChange={() => {}}
          required
          tabIndex={-1}
          className="sr-only opacity-0 w-0 h-0 absolute pointer-events-none"
        />
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full max-w-[90vw] min-w-[min(340px,90vw)] sm:min-w-[440px] z-50 bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Search Header */}
          <div className="p-2 border-b border-[rgb(var(--border))] bg-[rgb(var(--muted))/30] flex items-center gap-2">
            {isSearchingServer ? (
              <Loader2 className="w-4 h-4 text-indigo-500 animate-spin shrink-0 ml-2" />
            ) : (
              <Search className="w-4 h-4 text-indigo-500 shrink-0 ml-2" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tìm theo mã, tên, model, hãng, danh mục..."
              className="w-full bg-transparent border-none text-xs text-[rgb(var(--foreground))] focus:outline-none placeholder:text-[rgb(var(--muted-foreground))]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="p-1 rounded text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--accent))]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto p-1 divide-y divide-[rgb(var(--border))/40]">
            {filteredProducts.length === 0 ? (
              <div className="py-6 px-4 text-center space-y-2">
                {isSearchingServer ? (
                  <div className="space-y-2">
                    <Loader2 className="w-6 h-6 mx-auto text-indigo-500 animate-spin" />
                    <p className="text-xs text-[rgb(var(--muted-foreground))]">
                      Đang tìm kiếm trên máy chủ cho "{searchTerm}"...
                    </p>
                  </div>
                ) : (
                  <>
                    <Package className="w-8 h-8 mx-auto text-[rgb(var(--muted-foreground))] opacity-30" />
                    <p className="text-xs text-[rgb(var(--muted-foreground))]">
                      Không tìm thấy sản phẩm nào khớp từ khóa "{searchTerm}"
                    </p>
                    {onAddNew && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          onAddNew();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-500 text-xs font-bold hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Tạo Mã Sản Phẩm Mới Ngay</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : (
              filteredProducts.map((p, idx) => {
                const pid = getPid(p);
                const isSelected = pid === value;
                const isActive = idx === activeIndex;
                const brandStr = typeof p.brand === 'object' ? p.brand?.name : p.brand;
                const modelStr = p.modelName || p.model;

                return (
                  <div
                    key={pid}
                    onClick={() => handleSelect(p)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={cn(
                      'px-3 py-2.5 rounded-xl text-xs cursor-pointer flex items-center justify-between gap-3 transition-colors',
                      isSelected
                        ? 'bg-indigo-500/15 text-indigo-400 font-bold border border-indigo-500/30'
                        : isActive
                        ? 'bg-[rgb(var(--accent))] text-[rgb(var(--foreground))]'
                        : 'text-[rgb(var(--foreground))] hover:bg-[rgb(var(--accent))]'
                    )}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 shrink-0">
                        {p.productCode}
                      </span>
                      <div className="truncate">
                        <div className="font-semibold truncate">{p.name}</div>
                        <div className="text-[10px] text-[rgb(var(--muted-foreground))] flex items-center gap-2 font-normal mt-0.5 flex-wrap">
                          {p.category && <span>Danh mục: {p.category}</span>}
                          {modelStr && (
                            <span className="text-indigo-400 font-mono font-semibold">
                              • Model: {modelStr}
                            </span>
                          )}
                          {brandStr && <span>• Hãng: {brandStr}</span>}
                        </div>
                      </div>
                    </div>

                    {isSelected && <Check className="w-4 h-4 text-indigo-500 shrink-0" />}
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Create Footer Link */}
          {onAddNew && (
            <div className="p-2 border-t border-[rgb(var(--border))] bg-[rgb(var(--muted))/20] text-center">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onAddNew();
                }}
                className="w-full py-1.5 rounded-xl text-xs font-bold text-indigo-500 hover:bg-indigo-500/10 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Mã Sản Phẩm Mới (Master Catalog)</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
