import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Tag,
  Building2,
  Cpu,
  Layers,
  Hash,
  Barcode,
} from 'lucide-react';
import type { OcrFields } from '@/types/warranty';
import {
  HARDWARE_MANUFACTURERS,
  VIETNAM_DISTRIBUTORS,
  HARDWARE_PRODUCT_TYPES,
} from '@/types/warranty';
import { cn } from '@/lib/utils';

interface WarrantyOcrReviewFormProps {
  fields: OcrFields;
  onChange: (fields: OcrFields) => void;
  onConfirm: () => void;
  onRescan: () => void;
  isConfirmed: boolean;
  confidence?: number;
}

export function WarrantyOcrReviewForm({
  fields,
  onChange,
  onConfirm,
  onRescan,
  isConfirmed,
  confidence,
}: WarrantyOcrReviewFormProps) {
  const handleChange = (key: keyof OcrFields, value: any) => {
    onChange({
      ...fields,
      [key]: value,
    });
  };

  const isSerialMissing = !fields.serialNumber || !fields.serialNumber.trim();
  const isConfidenceLow = typeof confidence === 'number' && confidence < 0.7;

  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 md:p-6 shadow-sm space-y-5 animate-fade-in">
      {/* Header & Confidence Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[rgb(var(--border))]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[rgb(var(--foreground))] flex items-center gap-2">
              KẾT QUẢ NHẬN DẠNG OCR
              {isConfirmed && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium">
                  Đã xác nhận
                </span>
              )}
            </h3>
            <p className="text-xs text-[rgb(var(--muted-foreground))]">
              Vui lòng kiểm tra và chỉnh sửa lại các thông tin nếu cần trước khi tra cứu
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {typeof confidence === 'number' && (
            <span
              className={cn(
                'text-xs px-2.5 py-1 rounded-full border font-mono font-medium flex items-center gap-1.5',
                confidence >= 0.8
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  : confidence >= 0.6
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                  : 'bg-red-500/10 text-red-500 border-red-500/20'
              )}
            >
              Độ tin cậy OCR: {Math.round(confidence * 100)}%
            </span>
          )}

          <button
            type="button"
            onClick={onRescan}
            className="text-xs px-2.5 py-1 rounded-xl bg-[rgb(var(--muted))] hover:bg-[rgb(var(--muted))]/80 text-[rgb(var(--foreground))] transition-colors inline-flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Quét lại
          </button>
        </div>
      </div>

      {/* Warnings */}
      {isSerialMissing && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Chưa tìm thấy Serial Number:</span> Vui lòng nhập số Serial Number vào ô bên dưới để có thể tra cứu bảo hành.
          </div>
        </div>
      )}

      {!isSerialMissing && isConfidenceLow && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Độ nét tem chưa cao:</span> Vui lòng đối chiếu kỹ lại số Serial <code className="font-mono font-bold bg-amber-500/20 px-1 rounded">{fields.serialNumber}</code> để tránh tra cứu nhầm.
          </div>
        </div>
      )}

      {/* Form Fields - 100% Editable */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
        {/* Manufacturer */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[rgb(var(--foreground))] flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-blue-500" />
            Hãng sản xuất (Manufacturer)
          </label>
          <div className="relative">
            <input
              type="text"
              list="manufacturers-list"
              value={fields.brand || ''}
              onChange={(e) => handleChange('brand', e.target.value)}
              placeholder="Ví dụ: ASUS, GIGABYTE, MSI..."
              className="w-full px-3.5 py-2 rounded-xl bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))]"
            />
            <datalist id="manufacturers-list">
              {HARDWARE_MANUFACTURERS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Product Type */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[rgb(var(--foreground))] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            Loại linh kiện (Product Type)
          </label>
          <select
            value={fields.productType || 'VGA'}
            onChange={(e) => handleChange('productType', e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))]"
          >
            {HARDWARE_PRODUCT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Distributor */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[rgb(var(--foreground))] flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-emerald-500" />
            Nhà phân phối (Distributor)
          </label>
          <div className="relative">
            <input
              type="text"
              list="distributors-list"
              value={fields.distributor || ''}
              onChange={(e) => handleChange('distributor', e.target.value)}
              placeholder="Ví dụ: Mai Hoàng, Synnex FPT..."
              className="w-full px-3.5 py-2 rounded-xl bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))]"
            />
            <datalist id="distributors-list">
              {VIETNAM_DISTRIBUTORS.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Product Name */}
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-semibold text-[rgb(var(--foreground))] flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-amber-500" />
            Tên sản phẩm đầy đủ (Product Name)
          </label>
          <input
            type="text"
            value={fields.productName || ''}
            onChange={(e) => handleChange('productName', e.target.value)}
            placeholder="Ví dụ: ASUS ROG STRIX RTX 5070 Gaming OC"
            className="w-full px-3.5 py-2 rounded-xl bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))]"
          />
        </div>

        {/* Model */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[rgb(var(--foreground))] flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-teal-500" />
            Model thiết bị
          </label>
          <input
            type="text"
            value={fields.model || ''}
            onChange={(e) => handleChange('model', e.target.value)}
            placeholder="Ví dụ: RTX 5070, B760M..."
            className="w-full px-3.5 py-2 rounded-xl bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))]"
          />
        </div>

        {/* Serial Number (Critical Field) */}
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-semibold text-[rgb(var(--foreground))] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Barcode className="w-3.5 h-3.5 text-[rgb(var(--primary))]" />
              Số Serial Number (S/N) <span className="text-red-500">*</span>
            </span>
            <span className="text-[11px] text-[rgb(var(--muted-foreground))]">Trường bắt buộc để tra cứu</span>
          </label>
          <input
            type="text"
            value={fields.serialNumber || ''}
            onChange={(e) => handleChange('serialNumber', e.target.value.toUpperCase())}
            placeholder="Nhập hoặc chỉnh sửa số Serial Number..."
            className={cn(
              'w-full px-3.5 py-2.5 rounded-xl bg-[rgb(var(--background))] border text-[rgb(var(--foreground))] font-mono font-bold tracking-wider text-base focus:outline-none focus:ring-2',
              isSerialMissing
                ? 'border-red-500 focus:ring-red-500'
                : 'border-[rgb(var(--primary))] focus:ring-[rgb(var(--primary))]'
            )}
          />
        </div>

        {/* Part Number */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[rgb(var(--foreground))] flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-purple-500" />
            Part Number / Mã linh kiện (P/N)
          </label>
          <input
            type="text"
            value={fields.partNumber || ''}
            onChange={(e) => handleChange('partNumber', e.target.value)}
            placeholder="Ví dụ: 90YV..., GV-N..."
            className="w-full px-3.5 py-2 rounded-xl bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))]"
          />
        </div>
      </div>

      {/* Confirmation Action Button */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[rgb(var(--border))]">
        <div className="text-xs text-[rgb(var(--muted-foreground))]">
          💡 Nhấn <span className="font-semibold text-[rgb(var(--foreground))]">Xác nhận thông tin</span> để hoàn tất kiểm tra OCR. Thao tác này{' '}
          <strong className="text-amber-500">chưa kích hoạt tìm kiếm bảo hành</strong>.
        </div>

        <button
          type="button"
          onClick={onConfirm}
          className={cn(
            'w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold transition-all inline-flex items-center justify-center gap-2 shadow',
            isConfirmed
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary))]/90 text-white shadow-blue-500/20'
          )}
        >
          <CheckCircle2 className="w-4 h-4" />
          {isConfirmed ? '✓ Đã xác nhận thông tin (Bấm để cập nhật lại)' : '✓ Xác nhận thông tin'}
        </button>
      </div>
    </div>
  );
}
