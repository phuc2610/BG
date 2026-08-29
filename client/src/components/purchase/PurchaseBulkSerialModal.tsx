import React, { useState, useMemo } from 'react';
import { X, Wand2, Barcode, CheckCircle2, RefreshCw, Sparkles, Layers } from 'lucide-react';
import type { PurchaseItemData } from './PurchaseItemRow';

interface PurchaseBulkSerialModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: PurchaseItemData[];
  selectedIndices: Set<number>;
  purchaseDate: string;
  onApply: (updatedItems: PurchaseItemData[]) => void;
}

export function PurchaseBulkSerialModal({
  isOpen,
  onClose,
  items,
  selectedIndices,
  purchaseDate,
  onApply,
}: PurchaseBulkSerialModalProps) {
  // Target scope: 'all' | 'selected' | 'empty_only'
  const [scope, setScope] = useState<'all' | 'selected' | 'empty_only'>(
    selectedIndices.size > 0 ? 'selected' : 'all'
  );

  // Pattern type: 'product_code' | 'code_date' | 'custom_prefix' | 'random'
  const [patternType, setPatternType] = useState<'product_code' | 'code_date' | 'custom_prefix' | 'random'>(
    'product_code'
  );

  const [customPrefix, setCustomPrefix] = useState('NP-');
  const [startNum, setStartNum] = useState(1);
  const [paddingDigits, setPaddingDigits] = useState(3);
  const [overwriteExisting, setOverwriteExisting] = useState(true);

  // Format date helper: '2026-08-28' -> '280826'
  const dateFormatted = useMemo(() => {
    try {
      const d = new Date(purchaseDate);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = String(d.getFullYear()).slice(-2);
      return `${day}${month}${year}`;
    } catch {
      return '2608';
    }
  }, [purchaseDate]);

  // Helper to generate random string
  const getRandomCode = (length = 6) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = '';
    for (let i = 0; i < length; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  // Preview generated serials for items in scope
  const previewData = useMemo(() => {
    return items.map((it, idx) => {
      // Check if item is in target scope
      let inScope = false;
      if (scope === 'all') {
        inScope = true;
      } else if (scope === 'selected') {
        inScope = selectedIndices.has(idx);
      } else if (scope === 'empty_only') {
        const count = (it.serialsRaw || '')
          .split(/[\n,;\t]+/)
          .filter((s) => s.trim().length > 0).length;
        inScope = count < Number(it.quantity);
      }

      if (!inScope) {
        return { item: it, index: idx, inScope: false, newSerials: [] };
      }

      // If not overwriting and already has serials
      const currentSerials = (it.serialsRaw || '')
        .split(/[\n,;\t]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      if (!overwriteExisting && currentSerials.length >= Number(it.quantity)) {
        return { item: it, index: idx, inScope: false, newSerials: currentSerials };
      }

      const qty = Math.max(1, Number(it.quantity) || 1);
      const generated: string[] = [];

      let basePrefix = '';
      if (patternType === 'product_code') {
        basePrefix = `${it.productCode || 'SP'}-`;
      } else if (patternType === 'code_date') {
        basePrefix = `${it.productCode || 'SP'}-${dateFormatted}-`;
      } else if (patternType === 'custom_prefix') {
        basePrefix = customPrefix.trim() || 'SN-';
      }

      for (let i = 0; i < qty; i++) {
        if (patternType === 'random') {
          const prefix = it.productCode ? `${it.productCode}-` : '';
          generated.push(`${prefix}${getRandomCode(6)}`);
        } else {
          const num = String(startNum + i).padStart(paddingDigits, '0');
          generated.push(`${basePrefix}${num}`);
        }
      }

      return { item: it, index: idx, inScope: true, newSerials: generated };
    });
  }, [items, scope, selectedIndices, patternType, customPrefix, startNum, paddingDigits, overwriteExisting, dateFormatted]);

  const targetCount = previewData.filter((p) => p.inScope).length;
  const targetTotalUnits = previewData
    .filter((p) => p.inScope)
    .reduce((sum, p) => sum + (Number(p.item.quantity) || 1), 0);

  const handleConfirm = () => {
    const updated = items.map((it, idx) => {
      const match = previewData.find((p) => p.index === idx);
      if (match && match.inScope && match.newSerials.length > 0) {
        return {
          ...it,
          serialsRaw: match.newSerials.join('\n'),
        };
      }
      return it;
    });

    onApply(updated);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl animate-fade-in flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgb(var(--border))] bg-[rgb(var(--muted))/30] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[rgb(var(--foreground))] flex items-center gap-2">
                Sinh Serial Number Hàng Loạt
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-indigo-500/20 text-indigo-400 font-normal">
                  Tự Động 100%
                </span>
              </h3>
              <p className="text-xs text-[rgb(var(--muted-foreground))]">
                Tự động đánh số Serial chuẩn xác cho toàn bộ dòng linh kiện trong phiếu
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--accent))]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* 1. Chọn Đối Tượng Áp Dụng */}
          <div className="space-y-1.5">
            <label className="font-bold text-[rgb(var(--foreground))] block">
              1. Áp Dụng Cho Dòng Nào:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  scope === 'all'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300 font-bold'
                    : 'border-[rgb(var(--border))] hover:bg-[rgb(var(--muted))/20] text-[rgb(var(--foreground))]'
                }`}
              >
                <div className="text-xs">Tất cả sản phẩm</div>
                <div className="text-[11px] text-[rgb(var(--muted-foreground))] font-normal mt-0.5">
                  ({items.length} dòng)
                </div>
              </button>

              <button
                type="button"
                disabled={selectedIndices.size === 0}
                onClick={() => setScope('selected')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  scope === 'selected'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300 font-bold'
                    : 'border-[rgb(var(--border))] hover:bg-[rgb(var(--muted))/20] text-[rgb(var(--foreground))] disabled:opacity-40'
                }`}
              >
                <div className="text-xs">Chỉ dòng đang chọn</div>
                <div className="text-[11px] text-[rgb(var(--muted-foreground))] font-normal mt-0.5">
                  ({selectedIndices.size} dòng)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScope('empty_only')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  scope === 'empty_only'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300 font-bold'
                    : 'border-[rgb(var(--border))] hover:bg-[rgb(var(--muted))/20] text-[rgb(var(--foreground))]'
                }`}
              >
                <div className="text-xs">Dòng chưa đủ Serial</div>
                <div className="text-[11px] text-[rgb(var(--muted-foreground))] font-normal mt-0.5">
                  (Bỏ qua dòng đã đủ)
                </div>
              </button>
            </div>
          </div>

          {/* 2. Chọn Định Dạng Mẫu Serial */}
          <div className="space-y-1.5 pt-2 border-t border-[rgb(var(--border))]">
            <label className="font-bold text-[rgb(var(--foreground))] block">
              2. Định Dạng Mẫu Mã Serial:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label
                className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${
                  patternType === 'product_code'
                    ? 'border-indigo-500 bg-indigo-500/10 font-bold'
                    : 'border-[rgb(var(--border))] hover:bg-[rgb(var(--muted))/20]'
                }`}
              >
                <input
                  type="radio"
                  name="patternType"
                  checked={patternType === 'product_code'}
                  onChange={() => setPatternType('product_code')}
                  className="accent-indigo-600"
                />
                <div>
                  <div className="text-[rgb(var(--foreground))]">Theo Mã SP + STT</div>
                  <div className="text-[11px] font-mono text-[rgb(var(--muted-foreground))]">
                    VD: VGA-RTX3060-001, 002...
                  </div>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${
                  patternType === 'code_date'
                    ? 'border-indigo-500 bg-indigo-500/10 font-bold'
                    : 'border-[rgb(var(--border))] hover:bg-[rgb(var(--muted))/20]'
                }`}
              >
                <input
                  type="radio"
                  name="patternType"
                  checked={patternType === 'code_date'}
                  onChange={() => setPatternType('code_date')}
                  className="accent-indigo-600"
                />
                <div>
                  <div className="text-[rgb(var(--foreground))]">Mã SP + Ngày Nhập + STT</div>
                  <div className="text-[11px] font-mono text-[rgb(var(--muted-foreground))]">
                    VD: CPU-I5-{dateFormatted}-001...
                  </div>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${
                  patternType === 'custom_prefix'
                    ? 'border-indigo-500 bg-indigo-500/10 font-bold'
                    : 'border-[rgb(var(--border))] hover:bg-[rgb(var(--muted))/20]'
                }`}
              >
                <input
                  type="radio"
                  name="patternType"
                  checked={patternType === 'custom_prefix'}
                  onChange={() => setPatternType('custom_prefix')}
                  className="accent-indigo-600"
                />
                <div className="flex-1">
                  <div className="text-[rgb(var(--foreground))]">Tiền tố tự nhập + STT</div>
                  <input
                    type="text"
                    placeholder="VD: NP-SN-"
                    value={customPrefix}
                    disabled={patternType !== 'custom_prefix'}
                    onChange={(e) => setCustomPrefix(e.target.value)}
                    className="w-full mt-1 px-2 py-1 rounded bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-xs font-mono"
                  />
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${
                  patternType === 'random'
                    ? 'border-indigo-500 bg-indigo-500/10 font-bold'
                    : 'border-[rgb(var(--border))] hover:bg-[rgb(var(--muted))/20]'
                }`}
              >
                <input
                  type="radio"
                  name="patternType"
                  checked={patternType === 'random'}
                  onChange={() => setPatternType('random')}
                  className="accent-indigo-600"
                />
                <div>
                  <div className="text-[rgb(var(--foreground))]">Mã Ngẫu Nhiên (Alphanumeric)</div>
                  <div className="text-[11px] font-mono text-[rgb(var(--muted-foreground))]">
                    VD: VGA-8K9F2A, VGA-B4N7Y9...
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* 3. Tùy Chọn Đánh Số */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[rgb(var(--border))]">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[rgb(var(--muted))/20] border border-[rgb(var(--border))]">
              <span className="font-semibold text-[rgb(var(--foreground))]">Bắt đầu từ số:</span>
              <input
                type="number"
                min={1}
                value={startNum}
                onChange={(e) => setStartNum(Math.max(1, Number(e.target.value)))}
                className="w-16 px-2 py-1 rounded-lg bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-center font-mono font-bold text-xs"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[rgb(var(--muted))/20] border border-[rgb(var(--border))]">
              <span className="font-semibold text-[rgb(var(--foreground))]">Độ dài số thứ tự:</span>
              <select
                value={paddingDigits}
                onChange={(e) => setPaddingDigits(Number(e.target.value))}
                className="px-2 py-1 rounded-lg bg-[rgb(var(--background))] border border-[rgb(var(--border))] font-mono font-bold text-xs"
              >
                <option value={3}>3 số (001, 002...)</option>
                <option value={4}>4 số (0001, 0002...)</option>
                <option value={5}>5 số (00001...)</option>
              </select>
            </div>
          </div>

          {/* 4. Xem Trước Kết Quả (Live Preview) */}
          <div className="space-y-1.5 pt-2 border-t border-[rgb(var(--border))]">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[rgb(var(--foreground))]">
                Xem Trước Kết Quả ({targetCount} dòng, {targetTotalUnits} linh kiện):
              </label>
              <span className="text-[11px] text-emerald-400 font-semibold">
                ✓ Sẽ sinh đủ {targetTotalUnits} serial
              </span>
            </div>

            <div className="border border-[rgb(var(--border))] rounded-xl overflow-hidden max-h-48 overflow-y-auto divide-y divide-[rgb(var(--border))/40]">
              {previewData.filter((p) => p.inScope).length === 0 ? (
                <div className="p-4 text-center text-[rgb(var(--muted-foreground))]">
                  Không có dòng nào phù hợp với phạm vi đã chọn.
                </div>
              ) : (
                previewData
                  .filter((p) => p.inScope)
                  .map(({ item, index, newSerials }) => (
                    <div key={index} className="p-2.5 flex items-center justify-between gap-3 hover:bg-[rgb(var(--muted))/20]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[10px] font-bold text-indigo-400 shrink-0">
                          #{index + 1}
                        </span>
                        <div className="truncate">
                          <div className="font-bold text-[rgb(var(--foreground))] truncate">
                            {item.productName || item.productCode || 'Sản phẩm'}
                          </div>
                          <div className="text-[10px] text-[rgb(var(--muted-foreground))]">
                            SL: {item.quantity} chiếc
                          </div>
                        </div>
                      </div>

                      <div className="font-mono text-[11px] text-emerald-400 font-semibold text-right shrink-0">
                        {newSerials.slice(0, 2).join(', ')}
                        {newSerials.length > 2 && ` ... (+${newSerials.length - 2})`}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[rgb(var(--border))] bg-[rgb(var(--muted))/20] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--accent))]"
          >
            Hủy Bỏ
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={targetCount === 0}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 flex items-center gap-1.5 transition-all"
          >
            <Wand2 className="w-4 h-4" />
            <span>Sinh & Áp Dụng Ngay Cho {targetTotalUnits} Sản Phẩm</span>
          </button>
        </div>
      </div>
    </div>
  );
}
