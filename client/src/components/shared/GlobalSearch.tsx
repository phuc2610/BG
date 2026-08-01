import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/store/uiStore';
import { cn, formatCurrency, debounce } from '@/lib/utils';
import type { Product, Quote } from '@/types';
import api from '@/lib/api';
import { Search, Package, FileText, X, Loader2 } from 'lucide-react';

export function GlobalSearch() {
  const navigate = useNavigate();
  const { globalSearchOpen, setGlobalSearchOpen } = useUIStore();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setGlobalSearchOpen(!globalSearchOpen);
      }
      if (e.key === 'Escape' && globalSearchOpen) {
        setGlobalSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [globalSearchOpen]);

  const searchAll = useCallback(
    debounce(async (searchTerm: string) => {
      if (!searchTerm.trim()) {
        setProducts([]);
        setQuotes([]);
        return;
      }
      setLoading(true);
      try {
        const [prodRes, quoteRes] = await Promise.all([
          api.get('/products', { params: { search: searchTerm, limit: 5 } }),
          api.get('/quotes', { params: { search: searchTerm, limit: 5 } }),
        ]);
        setProducts(prodRes.data.data);
        setQuotes(quoteRes.data.data);
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250),
    []
  );

  useEffect(() => {
    searchAll(query);
  }, [query]);

  if (!globalSearchOpen) return null;

  return (
    <>
      <div className="overlay" onClick={() => setGlobalSearchOpen(false)} />
      <div
        className={cn(
          'fixed inset-x-4 top-[15%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[640px]',
          'rounded-2xl border shadow-2xl z-50 overflow-hidden flex flex-col',
          'bg-[rgb(var(--card))] border-[rgb(var(--border))]',
          'animate-scale-in'
        )}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[rgb(var(--border))]">
          <Search className="w-5 h-5 text-[rgb(var(--muted-foreground))]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm sản phẩm, mã SP, CPU, RAM, báo giá, tên khách..."
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-[rgb(var(--muted-foreground))]"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')}>
              <X className="w-4 h-4 text-[rgb(var(--muted-foreground))]" />
            </button>
          )}
          <kbd className="px-2 py-0.5 rounded text-[10px] font-mono bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))]">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : !query.trim() ? (
            <div className="text-center py-10 text-[rgb(var(--muted-foreground))]">
              <Search className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Gõ để tìm kiếm toàn bộ hệ thống...</p>
            </div>
          ) : products.length === 0 && quotes.length === 0 ? (
            <div className="text-center py-10 text-[rgb(var(--muted-foreground))]">
              <p className="text-sm">Không tìm thấy kết quả phù hợp với "{query}"</p>
            </div>
          ) : (
            <>
              {products.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[rgb(var(--muted-foreground))] uppercase tracking-wider">
                    <Package className="w-3.5 h-3.5" />
                    Mã sản phẩm ({products.length})
                  </div>
                  <div className="space-y-1 mt-1">
                    {products.map((product) => (
                      <button
                        key={product._id}
                        onClick={() => {
                          setGlobalSearchOpen(false);
                          navigate(`/products/${product._id}`);
                        }}
                        className="flex items-center gap-3 w-full p-2.5 rounded-xl text-left hover:bg-[rgb(var(--accent))] transition-smooth group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-[rgb(var(--muted))] overflow-hidden flex-shrink-0">
                          {product.images?.[0]?.url ? (
                            <img src={product.images[0].url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-4 h-4 opacity-30" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate group-hover:text-blue-500 transition-smooth">
                            {product.name}
                          </p>
                          <p className="text-xs text-[rgb(var(--muted-foreground))]">{product.productCode} • {product.category}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {quotes.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[rgb(var(--muted-foreground))] uppercase tracking-wider">
                    <FileText className="w-3.5 h-3.5" />
                    Báo giá ({quotes.length})
                  </div>
                  <div className="space-y-1 mt-1">
                    {quotes.map((quote) => (
                      <button
                        key={quote._id}
                        onClick={() => {
                          setGlobalSearchOpen(false);
                          navigate(`/quotes/${quote._id}`);
                        }}
                        className="flex items-center gap-3 w-full p-2.5 rounded-xl text-left hover:bg-[rgb(var(--accent))] transition-smooth group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 text-blue-500">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate group-hover:text-blue-500 transition-smooth">
                            {quote.quoteCode} — {quote.customer.name}
                          </p>
                          <p className="text-xs text-[rgb(var(--muted-foreground))]">
                            {quote.items.length} linh kiện • Status: {quote.status}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-blue-500">
                          {formatCurrency(quote.grandTotal)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
