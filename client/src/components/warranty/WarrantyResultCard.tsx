import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Building2,
  RefreshCw,
  PlusCircle,
  Info,
} from 'lucide-react';
import type { AggregatedResult } from '@/types/warranty';
import { formatDate, cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface WarrantyResultCardProps {
  result: AggregatedResult;
  onResetSearch: () => void;
  onApplyToInventory?: (result: AggregatedResult) => void;
}

export function WarrantyResultCard({
  result,
  onResetSearch,
  onApplyToInventory,
}: WarrantyResultCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = `KẾT QUẢ BẢO HÀNH:
- Số Serial: ${result.serialNumber}
- Hãng/Model: ${result.brand || ''} ${result.model || ''}
- Trạng thái: ${
      result.overallStatus === 'ACTIVE'
        ? 'CÒN BẢO HÀNH'
        : result.overallStatus === 'EXPIRED'
        ? 'HẾT HẠN'
        : 'CHƯA RÕ THÔNG TIN'
    }
- Hạn bảo hành: ${result.warrantyEndDate ? formatDate(result.warrantyEndDate) : 'Không xác định'}
- Nguồn xác thực: ${result.primaryResult?.providerName || 'N/A'}
- Mã tra cứu: ${result.searchCode}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Đã sao chép kết quả vào bộ nhớ tạm');
    setTimeout(() => setCopied(false), 2000);
  };

  const isGood = result.overallStatus === 'ACTIVE';
  const isExpired = result.overallStatus === 'EXPIRED';
  const isNotFound = result.overallStatus === 'NOT_FOUND';

  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] overflow-hidden shadow-md animate-fade-in space-y-6">
      {/* Top Banner Status */}
      <div
        className={cn(
          'p-5 md:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4',
          isGood
            ? 'bg-gradient-to-r from-emerald-600 to-teal-700'
            : isExpired
            ? 'bg-gradient-to-r from-amber-600 to-orange-700'
            : 'bg-gradient-to-r from-slate-700 to-zinc-800'
        )}
      >
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
            {isGood ? (
              <CheckCircle2 className="w-7 h-7 text-white" />
            ) : isExpired ? (
              <AlertTriangle className="w-7 h-7 text-white" />
            ) : (
              <XCircle className="w-7 h-7 text-white" />
            )}
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider font-semibold opacity-90">
              Trạng thái tra cứu:
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight">
              {isGood
                ? '🟢 CÒN BẢO HÀNH CHÍNH HÃNG'
                : isExpired
                ? '🔴 HẾT HẠN BẢO HÀNH'
                : '⚪ KHÔNG TÌM THẤY THÔNG TIN BẢO HÀNH'}
            </h2>
            <div className="text-xs opacity-80 mt-0.5">
              Mã giao dịch tra cứu: <span className="font-mono font-bold">{result.searchCode}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Đã chép' : 'Sao chép'}
          </button>

          <button
            type="button"
            onClick={onResetSearch}
            className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            Tra cứu mới
          </button>
        </div>
      </div>

      <div className="p-5 md:p-6 space-y-6 pt-0">
        {/* Conflicts Warning */}
        {result.hasConflicts && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Lưu ý xung đột dữ liệu:</span> {result.conflictNotes}. Vui lòng đối chiếu tem dán vật lý của NPP để xác nhận chính xác nhất.
            </div>
          </div>
        )}

        {/* Primary Warranty Summary Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-5 rounded-2xl bg-[rgb(var(--background))] border border-[rgb(var(--border))]">
          <div>
            <div className="text-xs text-[rgb(var(--muted-foreground))]">Số Serial Number:</div>
            <div className="text-base font-black font-mono tracking-wider text-[rgb(var(--foreground))] mt-0.5">
              {result.serialNumber}
            </div>
          </div>

          <div>
            <div className="text-xs text-[rgb(var(--muted-foreground))]">Thiết bị / Model:</div>
            <div className="text-sm font-bold text-[rgb(var(--foreground))] mt-0.5 truncate">
              {result.brand ? `${result.brand} ` : ''}
              {result.model || result.productType || 'Linh kiện phần cứng'}
            </div>
          </div>

          <div>
            <div className="text-xs text-[rgb(var(--muted-foreground))]">Hạn bảo hành đến:</div>
            <div className="text-base font-extrabold text-[rgb(var(--foreground))] flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-4 h-4 text-[rgb(var(--primary))]" />
              {result.warrantyEndDate ? (
                formatDate(result.warrantyEndDate)
              ) : (
                <span className="text-[rgb(var(--muted-foreground))] text-sm font-normal">Không xác định</span>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs text-[rgb(var(--muted-foreground))]">Thời gian còn lại:</div>
            <div className="text-base font-extrabold text-[rgb(var(--foreground))] mt-0.5">
              {typeof result.remainingDays === 'number' ? (
                result.remainingDays > 0 ? (
                  <span className="text-emerald-500">{result.remainingDays} ngày</span>
                ) : (
                  <span className="text-red-500">Đã hết hạn</span>
                )
              ) : (
                <span className="text-[rgb(var(--muted-foreground))] text-sm font-normal">—</span>
              )}
            </div>
          </div>
        </div>

        {/* Details Table Across All Providers */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-[rgb(var(--foreground))] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[rgb(var(--primary))]" />
              CHI TIẾT KẾT QUẢ THEO TỪNG NGUỒN TRA CỨU ({result.providerResults.length})
            </h4>
            <span className="text-xs text-[rgb(var(--muted-foreground))]">
              Tìm thấy: <strong className="text-[rgb(var(--foreground))]">{result.totalFound}</strong> / {result.totalQueried} nguồn
            </span>
          </div>

          <div className="border border-[rgb(var(--border))] rounded-2xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))] uppercase font-semibold border-b border-[rgb(var(--border))]">
                <tr>
                  <th className="p-3.5">Nguồn cung cấp</th>
                  <th className="p-3.5">Loại</th>
                  <th className="p-3.5">Trạng thái</th>
                  <th className="p-3.5">Hạn bảo hành</th>
                  <th className="p-3.5">Ghi chú / Thông báo</th>
                  <th className="p-3.5 text-right">Cổng tra cứu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--border))]">
                {result.providerResults.map((pr) => (
                  <tr
                    key={pr.providerId}
                    className={cn(
                      'hover:bg-[rgb(var(--muted))]/50 transition-colors',
                      pr.status === 'ACTIVE' && 'bg-emerald-500/[0.02]'
                    )}
                  >
                    <td className="p-3.5 font-bold text-[rgb(var(--foreground))] whitespace-nowrap">
                      {pr.providerName}
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-semibold uppercase',
                          pr.providerType === 'MANUFACTURER'
                            ? 'bg-blue-500/10 text-blue-500'
                            : 'bg-indigo-500/10 text-indigo-500'
                        )}
                      >
                        {pr.providerType === 'MANUFACTURER' ? 'Hãng' : 'NPP'}
                      </span>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold',
                          pr.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : pr.status === 'EXPIRED'
                            ? 'bg-amber-500/10 text-amber-500'
                            : pr.status === 'ERROR'
                            ? 'bg-red-500/10 text-red-500'
                            : 'bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))]'
                        )}
                      >
                        {pr.status === 'ACTIVE'
                          ? '✓ Còn BH'
                          : pr.status === 'EXPIRED'
                          ? 'Hết hạn'
                          : pr.status === 'ERROR'
                          ? 'Lỗi kết nối'
                          : 'Không tìm thấy'}
                      </span>
                    </td>

                    <td className="p-3.5 font-mono font-medium text-[rgb(var(--foreground))] whitespace-nowrap">
                      {pr.warrantyEndDate ? formatDate(pr.warrantyEndDate) : '—'}
                    </td>

                    <td className="p-3.5 text-xs min-w-[240px]">
                      {pr.notes?.includes('⚠️') ? (
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 font-medium leading-relaxed shadow-sm">
                          {pr.notes}
                        </div>
                      ) : (
                        <span className="text-[rgb(var(--muted-foreground))]">
                          {pr.notes || pr.error || '—'}
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-right whitespace-nowrap">
                      {pr.sourceUrl ? (
                        <a
                          href={pr.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                            pr.notes?.includes('⚠️')
                              ? 'bg-[rgb(var(--primary))] text-white shadow hover:opacity-90'
                              : 'text-[rgb(var(--primary))] bg-[rgb(var(--primary))]/10 hover:bg-[rgb(var(--primary))]/20'
                          )}
                        >
                          {pr.notes?.includes('⚠️') ? 'Mở cổng (Điền sẵn S/N)' : 'Cổng tra cứu'}
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Button: Apply to Inventory */}
        {onApplyToInventory && isGood && (
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => onApplyToInventory(result)}
              className="px-5 py-2.5 rounded-xl bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary))]/90 text-white text-xs font-bold transition-all shadow inline-flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Gắn thông tin bảo hành này vào kho linh kiện
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
