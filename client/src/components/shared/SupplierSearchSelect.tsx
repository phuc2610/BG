import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X, Plus, Building2, Phone, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SupplierRecord } from '@/types';

interface SupplierSearchSelectProps {
  suppliers: (SupplierRecord | any)[];
  value: string;
  onChange: (supplierId: string) => void;
  placeholder?: string;
  onAddNew?: () => void;
  required?: boolean;
}

export function SupplierSearchSelect({
  suppliers,
  value,
  onChange,
  placeholder = '-- Tìm & Chọn Nhà Cung Cấp (Tên, Mã NCC, SĐT) --',
  onAddNew,
  required = false,
}: SupplierSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Helper to get string ID
  const getSid = (s: any) =>
    typeof s?._id === 'string'
      ? s._id
      : s?._id?.toString() || s?.id || String(s?._id || '');

  // Currently selected supplier
  const selectedSupplier = suppliers.find((s) => getSid(s) === value);

  // Filter suppliers by search term (code, name, phone, company, contact person)
  const filteredSuppliers = suppliers.filter((s) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    const code = (s.supplierCode || '').toLowerCase();
    const name = (s.name || '').toLowerCase();
    const phone = (s.phone || '').toLowerCase();
    const company = (s.companyName || '').toLowerCase();
    const contact = (s.contactPerson || '').toLowerCase();
    return (
      code.includes(term) ||
      name.includes(term) ||
      phone.includes(term) ||
      company.includes(term) ||
      contact.includes(term)
    );
  });

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

  const handleSelect = (sId: string) => {
    onChange(sId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', isOpen && 'z-50')}>
      {/* Target trigger box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full px-3.5 py-2.5 rounded-xl text-sm bg-[rgb(var(--background))] border transition-all cursor-pointer flex items-center justify-between gap-2 select-none min-h-[42px]',
          isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
            : 'border-[rgb(var(--border))] hover:border-indigo-500/50',
          !selectedSupplier && required && 'border-red-500/40'
        )}
      >
        {selectedSupplier ? (
          <div className="flex items-center gap-2 overflow-hidden truncate">
            <span className="px-2 py-0.5 rounded-lg text-xs font-bold font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
              {selectedSupplier.supplierCode || 'NCC'}
            </span>
            <span className="font-semibold text-[rgb(var(--foreground))] truncate text-sm">
              {selectedSupplier.name}
            </span>
            {selectedSupplier.phone && (
              <span className="text-xs text-[rgb(var(--muted-foreground))] shrink-0">
                ({selectedSupplier.phone})
              </span>
            )}
            {selectedSupplier.companyName && (
              <span className="text-xs text-indigo-400 truncate hidden md:inline">
                • {selectedSupplier.companyName}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[rgb(var(--muted-foreground))]">
            <Building2 className="w-4 h-4 opacity-50" />
            <span className="text-sm">{placeholder}</span>
          </div>
        )}

        <div className="flex items-center gap-1 shrink-0 text-[rgb(var(--muted-foreground))]">
          {selectedSupplier && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:text-red-400 rounded-md hover:bg-[rgb(var(--accent))] transition-colors"
              title="Bỏ chọn"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={cn(
              'w-4 h-4 transition-transform duration-200',
              isOpen && 'transform rotate-180 text-indigo-500'
            )}
          />
        </div>
      </div>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-2xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[340px]">
          {/* Search Box Header */}
          <div className="p-2.5 border-b border-[rgb(var(--border))] bg-[rgb(var(--muted))/20] shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--muted-foreground))]" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Gõ tên NCC, Mã NCC000..., SĐT, Công ty để tìm..."
                className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Supplier List */}
          <div className="overflow-y-auto flex-1 p-1.5 space-y-1 divide-y divide-[rgb(var(--border))/40]">
            {filteredSuppliers.length === 0 ? (
              <div className="py-8 text-center text-xs text-[rgb(var(--muted-foreground))] space-y-2">
                <Building2 className="w-8 h-8 mx-auto opacity-30" />
                <p>Không tìm thấy Nhà cung cấp nào khớp với "{searchTerm}"</p>
                {onAddNew && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onAddNew();
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm nhanh Nhà Cung Cấp Mới</span>
                  </button>
                )}
              </div>
            ) : (
              filteredSuppliers.map((s) => {
                const sId = getSid(s);
                const isSelected = sId === value;

                return (
                  <div
                    key={sId}
                    onClick={() => handleSelect(sId)}
                    className={cn(
                      'p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 text-xs',
                      isSelected
                        ? 'bg-indigo-600/15 border border-indigo-500/40 text-[rgb(var(--foreground))] shadow-sm'
                        : 'hover:bg-[rgb(var(--muted))/60] text-[rgb(var(--foreground))]'
                    )}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                          {s.supplierCode || 'NCC'}
                        </span>
                        <span className="font-bold text-sm text-[rgb(var(--foreground))] truncate">
                          {s.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-[rgb(var(--muted-foreground))] flex-wrap">
                        {s.phone && (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <Phone className="w-3 h-3" />
                            {s.phone}
                          </span>
                        )}
                        {s.companyName && (
                          <span className="flex items-center gap-1 text-blue-400 truncate">
                            <Building2 className="w-3 h-3 shrink-0" />
                            {s.companyName}
                          </span>
                        )}
                        {s.contactPerson && (
                          <span className="flex items-center gap-1 text-indigo-400">
                            <User className="w-3 h-3" />
                            {s.contactPerson}
                          </span>
                        )}
                        {s.address && (
                          <span className="truncate max-w-[200px] opacity-70">
                            • {s.address}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Add Supplier Action at bottom */}
          {onAddNew && (
            <div className="p-2 border-t border-[rgb(var(--border))] bg-[rgb(var(--muted))/30] shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onAddNew();
                }}
                className="w-full py-2 rounded-xl text-xs font-bold text-indigo-400 hover:bg-indigo-500/15 flex items-center justify-center gap-1.5 transition-colors border border-dashed border-indigo-500/30"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm Nhà Cung Cấp Mới</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
