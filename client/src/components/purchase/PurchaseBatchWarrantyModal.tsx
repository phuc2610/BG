import React, { useState } from 'react';
import { X, ShieldCheck, Check } from 'lucide-react';

interface PurchaseBatchWarrantyModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  onApply: (value: number, unit: 'day' | 'month' | 'year') => void;
}

export function PurchaseBatchWarrantyModal({
  isOpen,
  onClose,
  selectedCount,
  onApply,
}: PurchaseBatchWarrantyModalProps) {
  const [warrantyValue, setWarrantyValue] = useState<number>(12);
  const [warrantyUnit, setWarrantyUnit] = useState<'day' | 'month' | 'year'>('month');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApply(warrantyValue, warrantyUnit);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[rgb(var(--border))] bg-[rgb(var(--muted))/30]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-sm text-[rgb(var(--foreground))]">
              Đặt Bảo Hành Hàng Loạt
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--accent))]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <p className="text-[rgb(var(--muted-foreground))]">
            Áp dụng thời hạn bảo hành cho <strong>{selectedCount}</strong> dòng sản phẩm đang chọn:
          </p>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              required
              value={warrantyValue}
              onChange={(e) => setWarrantyValue(Math.max(0, Number(e.target.value)))}
              className="w-24 px-3 py-2 rounded-xl text-sm font-mono font-bold bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] text-center focus:outline-none focus:border-indigo-500"
            />
            <select
              value={warrantyUnit}
              onChange={(e) => setWarrantyUnit(e.target.value as any)}
              className="flex-1 px-3 py-2 rounded-xl text-sm font-semibold bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] focus:outline-none focus:border-indigo-500"
            >
              <option value="month">Tháng</option>
              <option value="year">Năm</option>
              <option value="day">Ngày</option>
            </select>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[1, 3, 6, 12, 24, 36].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setWarrantyValue(m);
                  setWarrantyUnit('month');
                }}
                className={`px-2.5 py-1 rounded-lg font-bold border transition-colors ${
                  warrantyValue === m && warrantyUnit === 'month'
                    ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40'
                    : 'bg-[rgb(var(--muted))/30] text-[rgb(var(--muted-foreground))] border-[rgb(var(--border))] hover:text-[rgb(var(--foreground))]'
                }`}
              >
                {m} tháng
              </button>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[rgb(var(--border))]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl font-medium text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--accent))]"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-500 flex items-center gap-1 shadow-md shadow-indigo-500/20"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Áp Dụng Cho {selectedCount} Dòng</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
