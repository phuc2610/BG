import React, { useState, useRef, useMemo } from 'react';
import {
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Wand2,
  RotateCcw,
  Sparkles,
  Barcode,
  Calendar,
} from 'lucide-react';
import { ProductSearchSelect } from '@/components/shared/ProductSearchSelect';
import { ProductCondition } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';

export interface PurchaseItemData {
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
}

interface PurchaseItemRowProps {
  index: number;
  item: PurchaseItemData;
  products: any[];
  isSelected: boolean;
  isCompact: boolean;
  canRemove: boolean;
  purchaseDate: string;
  globalSerialSet?: Map<string, number>; // Maps each trimmed serial to occurrence count in whole form
  onSelectRow: (selected: boolean) => void;
  onChangeField: (field: string, value: any) => void;
  onSelectProduct: (productId: string, product?: any) => void;
  onRemove: () => void;
  onOpenProductModal: () => void;
  onEnterPressAtEnd: () => void;
}

export function PurchaseItemRow({
  index,
  item,
  products,
  isSelected,
  isCompact,
  canRemove,
  purchaseDate,
  globalSerialSet,
  onSelectRow,
  onChangeField,
  onSelectProduct,
  onRemove,
  onOpenProductModal,
  onEnterPressAtEnd,
}: PurchaseItemRowProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [prefix, setPrefix] = useState('');

  // Input refs for keyboard navigation
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const costPriceInputRef = useRef<HTMLInputElement>(null);
  const listPriceInputRef = useRef<HTMLInputElement>(null);
  const warrantyValueInputRef = useRef<HTMLInputElement>(null);

  // Parse serials
  const parsedSerials = useMemo(() => {
    return (item.serialsRaw || '')
      .split(/[\n,;\t]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }, [item.serialsRaw]);

  // Check for local duplicates within this row
  const localDuplicates = useMemo(() => {
    const counts = new Map<string, number>();
    const dupes = new Set<string>();
    parsedSerials.forEach((sn) => {
      const lower = sn.toLowerCase();
      const current = counts.get(lower) || 0;
      counts.set(lower, current + 1);
      if (current >= 1) dupes.add(sn);
    });
    return dupes;
  }, [parsedSerials]);

  // Check for global duplicates across other rows
  const hasGlobalDuplicates = useMemo(() => {
    if (!globalSerialSet) return false;
    for (const sn of parsedSerials) {
      const lower = sn.toLowerCase();
      if ((globalSerialSet.get(lower) || 0) > 1) {
        return true;
      }
    }
    return false;
  }, [parsedSerials, globalSerialSet]);

  const serialCount = parsedSerials.length;
  const isOverQuantity = serialCount > Number(item.quantity);
  const hasDuplicates = localDuplicates.size > 0 || hasGlobalDuplicates;

  // Serial status determination
  const serialStatus: 'empty' | 'ok' | 'warning' | 'error' = useMemo(() => {
    if (hasDuplicates || isOverQuantity) return 'error';
    if (serialCount === 0) return 'empty';
    if (serialCount === Number(item.quantity)) return 'ok';
    return 'warning';
  }, [serialCount, item.quantity, hasDuplicates, isOverQuantity]);

  // Auto-generate serials based on prefix and quantity
  const handleAutoGenerateSerials = () => {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const cleanPrefix = prefix.trim() || `${item.productCode || 'SN'}-`;
    const newSerials: string[] = [];
    for (let i = 1; i <= qty; i++) {
      const numStr = String(i).padStart(3, '0');
      newSerials.push(`${cleanPrefix}${numStr}`);
    }
    onChangeField('serialsRaw', newSerials.join('\n'));
  };

  const handleClearSerials = () => {
    onChangeField('serialsRaw', '');
  };

  const totalPrice = (Number(item.quantity) || 0) * (Number(item.costPrice) || 0);

  // Keyboard navigation within row
  const handleKeyDown = (e: React.KeyboardEvent, currentField: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (currentField === 'quantity') {
        costPriceInputRef.current?.focus();
        costPriceInputRef.current?.select();
      } else if (currentField === 'costPrice') {
        listPriceInputRef.current?.focus();
        listPriceInputRef.current?.select();
      } else if (currentField === 'listPrice') {
        warrantyValueInputRef.current?.focus();
        warrantyValueInputRef.current?.select();
      } else if (currentField === 'warranty') {
        onEnterPressAtEnd();
      }
    }
  };

  return (
    <div
      id={`purchase-item-row-${index}`}
      style={{ zIndex: Math.max(1, 50 - index) }}
      className={cn(
        'group transition-colors border-b border-[rgb(var(--border))] last:border-b-0 relative',
        isSelected ? 'bg-indigo-500/5' : 'hover:bg-[rgb(var(--muted))/20]',
        !item.productId && 'bg-red-500/5'
      )}
    >
      {/* Desktop Grid Layout (>= 820px) */}
      <div
        className={cn(
          'hidden md:grid grid-cols-[32px_32px_minmax(220px,1fr)_75px_120px_120px_125px_120px_90px_36px] items-center gap-2',
          isCompact ? 'py-1.5 px-3 text-xs' : 'py-2.5 px-3.5 text-sm'
        )}
      >
        {/* Col 1: Checkbox */}
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelectRow(e.target.checked)}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
          />
        </div>

        {/* Col 2: STT */}
        <div className="text-center font-mono text-[rgb(var(--muted-foreground))] font-bold text-xs">
          {index + 1}
        </div>

        {/* Col 3: Product Combobox */}
        <div className="min-w-0 relative">
          <div className="flex items-center gap-1">
            <div className="flex-1 min-w-0">
              <ProductSearchSelect
                required
                products={products}
                value={item.productId}
                onChange={(pId, prod) => onSelectProduct(pId, prod)}
                onAddNew={onOpenProductModal}
                placeholder="-- Chọn linh kiện / sản phẩm --"
                onSelectAndFocusNext={() => {
                  quantityInputRef.current?.focus();
                  quantityInputRef.current?.select();
                }}
              />
            </div>
            <button
              type="button"
              onClick={onOpenProductModal}
              title="Thêm mã sản phẩm mới vào danh mục"
              className="p-2 rounded-xl text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Col 4: Quantity */}
        <div>
          <input
            ref={quantityInputRef}
            type="number"
            min={1}
            required
            value={item.quantity === 0 ? '' : item.quantity}
            onChange={(e) => onChangeField('quantity', Math.max(1, Number(e.target.value) || 0))}
            onKeyDown={(e) => handleKeyDown(e, 'quantity')}
            className={cn(
              'w-full px-2 py-1.5 rounded-xl font-mono tabular-nums text-center font-bold bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] focus:outline-none focus:border-indigo-500',
              isCompact ? 'text-xs h-8' : 'text-sm h-9'
            )}
          />
        </div>

        {/* Col 5: Cost Price */}
        <div>
          <input
            ref={costPriceInputRef}
            type="number"
            min={0}
            step={1000}
            required
            value={item.costPrice === 0 ? '' : item.costPrice}
            onChange={(e) => onChangeField('costPrice', Number(e.target.value) || 0)}
            onKeyDown={(e) => handleKeyDown(e, 'costPrice')}
            placeholder="0"
            className={cn(
              'w-full px-2.5 py-1.5 rounded-xl font-mono tabular-nums text-right font-medium bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] focus:outline-none focus:border-indigo-500',
              isCompact ? 'text-xs h-8' : 'text-sm h-9'
            )}
          />
        </div>

        {/* Col 6: List / Selling Price */}
        <div>
          <input
            ref={listPriceInputRef}
            type="number"
            min={0}
            step={1000}
            value={item.listPrice === 0 ? '' : item.listPrice}
            onChange={(e) => onChangeField('listPrice', Number(e.target.value) || 0)}
            onKeyDown={(e) => handleKeyDown(e, 'listPrice')}
            placeholder="0"
            className={cn(
              'w-full px-2.5 py-1.5 rounded-xl font-mono tabular-nums text-right font-semibold bg-[rgb(var(--background))] border border-emerald-500/30 text-emerald-400 focus:outline-none focus:border-emerald-500',
              isCompact ? 'text-xs h-8' : 'text-sm h-9'
            )}
          />
        </div>

        {/* Col 7: Warranty (Merged Input + Unit Select) */}
        <div>
          <div className="flex items-center rounded-xl bg-[rgb(var(--background))] border border-[rgb(var(--border))] overflow-hidden focus-within:border-indigo-500">
            <input
              ref={warrantyValueInputRef}
              type="number"
              min={0}
              value={item.supplierWarrantyValue ?? 12}
              onChange={(e) => onChangeField('supplierWarrantyValue', Number(e.target.value) || 0)}
              onKeyDown={(e) => handleKeyDown(e, 'warranty')}
              className={cn(
                'w-12 px-1.5 py-1 text-center font-mono tabular-nums font-bold bg-transparent text-[rgb(var(--foreground))] focus:outline-none',
                isCompact ? 'text-xs h-8' : 'text-sm h-9'
              )}
            />
            <select
              value={item.supplierWarrantyUnit || 'month'}
              onChange={(e) => onChangeField('supplierWarrantyUnit', e.target.value)}
              className={cn(
                'px-1 py-1 bg-transparent text-[11px] font-semibold text-[rgb(var(--muted-foreground))] border-l border-[rgb(var(--border))] focus:outline-none cursor-pointer',
                isCompact ? 'h-8' : 'h-9'
              )}
            >
              <option value="month">Tháng</option>
              <option value="day">Ngày</option>
              <option value="year">Năm</option>
            </select>
          </div>
        </div>

        {/* Col 8: Total Amount */}
        <div className="text-right font-mono tabular-nums font-bold text-[rgb(var(--foreground))] truncate">
          {formatCurrency(totalPrice)}
        </div>

        {/* Col 9: Serial Toggle Button */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className={cn(
              'px-2 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1 transition-all border shadow-sm',
              serialStatus === 'empty' &&
                'bg-[rgb(var(--muted))/40] text-[rgb(var(--muted-foreground))] border-[rgb(var(--border))] hover:bg-[rgb(var(--muted))]',
              serialStatus === 'ok' &&
                'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20',
              serialStatus === 'warning' &&
                'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20',
              serialStatus === 'error' &&
                'bg-red-500/15 text-red-400 border-red-500/40 hover:bg-red-500/25 animate-pulse'
            )}
            title={
              serialStatus === 'empty'
                ? 'Chưa nhập Serial (Click để nhập)'
                : serialStatus === 'ok'
                ? `Đã khớp đủ ${serialCount}/${item.quantity} Serial`
                : serialStatus === 'warning'
                ? `Còn thiếu: ${serialCount}/${item.quantity} Serial`
                : 'Serial bị trùng lặp hoặc thừa số lượng!'
            }
          >
            <Barcode className="w-3.5 h-3.5 shrink-0" />
            <span>
              {serialCount}/{item.quantity}
            </span>
            {isDrawerOpen ? (
              <ChevronUp className="w-3 h-3 ml-0.5 opacity-60" />
            ) : (
              <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
            )}
          </button>
        </div>

        {/* Col 10: Delete Button */}
        <div className="flex items-center justify-center">
          {canRemove ? (
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 rounded-lg text-[rgb(var(--muted-foreground))] hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Xóa dòng này"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <span className="w-4" />
          )}
        </div>
      </div>

      {/* Mobile Vertical Card Layout (< 820px) */}
      <div className="md:hidden p-4 space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--border))]">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelectRow(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 cursor-pointer accent-indigo-600"
            />
            <span className="text-xs font-bold font-mono text-indigo-400"># Mục {index + 1}</span>
          </div>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1 rounded text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Product Select */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-[rgb(var(--foreground))]">
              Sản Phẩm <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={onOpenProductModal}
              className="text-xs font-bold text-indigo-400 hover:underline flex items-center gap-0.5"
            >
              <Plus className="w-3 h-3" />
              <span>Tạo mới</span>
            </button>
          </div>
          <ProductSearchSelect
            required
            products={products}
            value={item.productId}
            onChange={(pId, prod) => onSelectProduct(pId, prod)}
            onAddNew={onOpenProductModal}
            placeholder="-- Chọn linh kiện / sản phẩm --"
          />
        </div>

        {/* Qty, Cost Price, List Price Grid */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <label className="block font-medium text-[rgb(var(--muted-foreground))] mb-1">Số Lượng</label>
            <input
              type="number"
              min={1}
              required
              value={item.quantity === 0 ? '' : item.quantity}
              onChange={(e) => onChangeField('quantity', Math.max(1, Number(e.target.value) || 0))}
              className="w-full px-2 py-1.5 rounded-xl font-mono tabular-nums text-center font-bold bg-[rgb(var(--background))] border border-[rgb(var(--border))]"
            />
          </div>

          <div>
            <label className="block font-medium text-[rgb(var(--muted-foreground))] mb-1">Giá Nhập</label>
            <input
              type="number"
              min={0}
              step={1000}
              required
              value={item.costPrice === 0 ? '' : item.costPrice}
              onChange={(e) => onChangeField('costPrice', Number(e.target.value) || 0)}
              className="w-full px-2 py-1.5 rounded-xl font-mono tabular-nums text-right bg-[rgb(var(--background))] border border-[rgb(var(--border))]"
            />
          </div>

          <div>
            <label className="block font-medium text-emerald-400 mb-1">Giá Bán</label>
            <input
              type="number"
              min={0}
              step={1000}
              value={item.listPrice === 0 ? '' : item.listPrice}
              onChange={(e) => onChangeField('listPrice', Number(e.target.value) || 0)}
              className="w-full px-2 py-1.5 rounded-xl font-mono tabular-nums text-right font-semibold text-emerald-400 bg-[rgb(var(--background))] border border-emerald-500/30"
            />
          </div>
        </div>

        {/* Warranty & Subtotal row */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[rgb(var(--muted-foreground))]">BH:</span>
            <div className="flex items-center rounded-xl bg-[rgb(var(--background))] border border-[rgb(var(--border))] overflow-hidden">
              <input
                type="number"
                min={0}
                value={item.supplierWarrantyValue ?? 12}
                onChange={(e) => onChangeField('supplierWarrantyValue', Number(e.target.value) || 0)}
                className="w-10 px-1 py-1 text-center font-mono text-xs font-bold bg-transparent"
              />
              <select
                value={item.supplierWarrantyUnit || 'month'}
                onChange={(e) => onChangeField('supplierWarrantyUnit', e.target.value)}
                className="px-1 py-1 bg-transparent text-[11px] font-semibold text-[rgb(var(--muted-foreground))] border-l border-[rgb(var(--border))]"
              >
                <option value="month">Thg</option>
                <option value="day">Ng</option>
                <option value="year">Năm</option>
              </select>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-[rgb(var(--muted-foreground))] mr-1.5">Thành tiền:</span>
            <span className="font-mono tabular-nums font-bold text-sm text-[rgb(var(--foreground))]">
              {formatCurrency(totalPrice)}
            </span>
          </div>
        </div>

        {/* Serial Drawer Button Mobile */}
        <button
          type="button"
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className={cn(
            'w-full py-2 px-3 rounded-xl text-xs font-mono font-bold flex items-center justify-between border transition-all',
            serialStatus === 'empty' && 'bg-[rgb(var(--muted))/40] text-[rgb(var(--muted-foreground))] border-[rgb(var(--border))]',
            serialStatus === 'ok' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
            serialStatus === 'warning' && 'bg-amber-500/10 text-amber-400 border-amber-500/30',
            serialStatus === 'error' && 'bg-red-500/15 text-red-400 border-red-500/40'
          )}
        >
          <div className="flex items-center gap-1.5">
            <Barcode className="w-4 h-4" />
            <span>Serial Numbers: {serialCount}/{item.quantity}</span>
          </div>
          {isDrawerOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Collapsible Serial Drawer */}
      {isDrawerOpen && (
        <div className="p-4 bg-[rgb(var(--muted))/25] border-t border-dashed border-[rgb(var(--border))] space-y-3 animate-in fade-in-50 duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-400 flex items-center gap-1">
                <Barcode className="w-4 h-4" />
                Danh Sách Serial Number ({serialCount}/{item.quantity})
              </span>
              {serialStatus === 'ok' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  Khớp đủ số lượng
                </span>
              )}
              {serialStatus === 'warning' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <AlertTriangle className="w-3 h-3" />
                  Thiếu {Math.max(0, Number(item.quantity) - serialCount)} serial
                </span>
              )}
              {serialStatus === 'error' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                  <AlertTriangle className="w-3 h-3" />
                  {isOverQuantity ? `Dư ${serialCount - Number(item.quantity)} serial` : 'Trùng lặp serial!'}
                </span>
              )}
            </div>

            {/* Auto Generation & Clear Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <div className="flex items-center rounded-xl bg-[rgb(var(--background))] border border-[rgb(var(--border))] overflow-hidden text-xs">
                <input
                  type="text"
                  placeholder="Tiền tố (vd: SN-)..."
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="w-32 px-2.5 py-1 bg-transparent text-xs text-[rgb(var(--foreground))] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAutoGenerateSerials}
                  className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 font-semibold border-l border-[rgb(var(--border))] flex items-center gap-1 transition-colors"
                  title="Sinh tự động số serial theo số lượng"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Sinh tự động</span>
                </button>
              </div>

              {serialCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearSerials}
                  className="px-2.5 py-1 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 border border-red-500/20 flex items-center gap-1 transition-colors"
                  title="Xóa toàn bộ serial của dòng này"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Xóa hết</span>
                </button>
              )}
            </div>
          </div>

          {/* Duplicate Warnings Display */}
          {localDuplicates.size > 0 && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Phát hiện serial trùng lặp trong dòng này: <strong>{Array.from(localDuplicates).join(', ')}</strong>
              </span>
            </div>
          )}

          {/* Textarea for Serials */}
          <textarea
            rows={Math.min(6, Math.max(3, serialCount + 1))}
            value={item.serialsRaw}
            onChange={(e) => onChangeField('serialsRaw', e.target.value)}
            placeholder={`Dán danh sách Serial (mỗi mã một dòng)...\nVí dụ:\n${item.productCode || 'SN'}-001\n${item.productCode || 'SN'}-002`}
            className="w-full px-3.5 py-2.5 rounded-xl font-mono text-xs bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 leading-relaxed"
          />

          <div className="flex items-center justify-between text-[11px] text-[rgb(var(--muted-foreground))]">
            <span>
              💡 Gợi ý: Có thể copy danh sách từ Excel/Notepad và paste trực tiếp vào ô trên.
            </span>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="text-xs font-semibold text-indigo-400 hover:underline"
            >
              Thu gọn
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
