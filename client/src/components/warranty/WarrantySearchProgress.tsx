import React from 'react';
import { Loader2, CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { ProviderResult } from '@/types/warranty';
import { cn } from '@/lib/utils';

interface WarrantySearchProgressProps {
  serialNumber: string;
  totalQueried: number;
  providerResults?: ProviderResult[];
  isSearching: boolean;
}

export function WarrantySearchProgress({
  serialNumber,
  totalQueried,
  providerResults = [],
  isSearching,
}: WarrantySearchProgressProps) {
  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 md:p-6 shadow-sm space-y-4 animate-fade-in">
      <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--border))]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[rgb(var(--foreground))]">
              ĐANG TIẾN HÀNH TRA CỨU BẢO HÀNH
            </h4>
            <p className="text-xs text-[rgb(var(--muted-foreground))]">
              Số Serial: <span className="font-mono font-bold text-[rgb(var(--foreground))]">{serialNumber}</span> ({totalQueried} nguồn)
            </p>
          </div>
        </div>

        {isSearching && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 font-medium animate-pulse">
            Đang truy vấn song song...
          </span>
        )}
      </div>

      {/* Progress Bars */}
      <div className="w-full bg-[rgb(var(--muted))] rounded-full h-2 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full w-2/3 animate-pulse" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs pt-1">
        {providerResults.length > 0 ? (
          providerResults.map((item) => (
            <div
              key={item.providerId}
              className={cn(
                'p-2.5 rounded-xl border flex items-center justify-between transition-colors',
                item.status === 'ACTIVE'
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : item.status === 'EXPIRED'
                  ? 'border-amber-500/30 bg-amber-500/5'
                  : item.status === 'ERROR'
                  ? 'border-red-500/30 bg-red-500/5'
                  : 'border-[rgb(var(--border))] bg-[rgb(var(--background))]'
              )}
            >
              <div className="flex items-center gap-2 truncate">
                {item.status === 'ACTIVE' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : item.status === 'EXPIRED' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                ) : item.status === 'ERROR' ? (
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span className="font-medium text-[rgb(var(--foreground))] truncate">
                  {item.providerName}
                </span>
              </div>

              <span
                className={cn(
                  'text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0',
                  item.status === 'ACTIVE'
                    ? 'text-emerald-500 bg-emerald-500/10'
                    : item.status === 'EXPIRED'
                    ? 'text-amber-500 bg-amber-500/10'
                    : item.status === 'ERROR'
                    ? 'text-red-500 bg-red-500/10'
                    : 'text-[rgb(var(--muted-foreground))] bg-[rgb(var(--muted))]'
                )}
              >
                {item.status === 'ACTIVE'
                  ? 'Tìm thấy'
                  : item.status === 'EXPIRED'
                  ? 'Hết hạn'
                  : item.status === 'ERROR'
                  ? 'Lỗi kết nối'
                  : 'Không thấy'}
              </span>
            </div>
          ))
        ) : (
          <div className="col-span-full py-4 text-center text-xs text-[rgb(var(--muted-foreground))] flex items-center justify-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[rgb(var(--primary))]" />
            Đang phân giải kết nối và gửi yêu cầu đến các cổng bảo hành...
          </div>
        )}
      </div>
    </div>
  );
}
