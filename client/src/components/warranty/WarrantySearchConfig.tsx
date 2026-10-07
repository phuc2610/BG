import React, { useMemo } from 'react';
import {
  Search,
  Check,
  Building2,
  Tag,
  ShieldCheck,
  CheckSquare,
  Square,
  Sparkles,
  Info,
  Radio,
  Globe2,
} from 'lucide-react';
import type {
  WarrantySearchMode,
  ProviderItem,
  OcrFields,
} from '@/types/warranty';
import {
  HARDWARE_MANUFACTURERS,
  VIETNAM_DISTRIBUTORS,
} from '@/types/warranty';
import { cn } from '@/lib/utils';

interface WarrantySearchConfigProps {
  searchMode: WarrantySearchMode;
  onSearchModeChange: (mode: WarrantySearchMode) => void;
  allProviders: ProviderItem[];
  selectedProviderIds: string[];
  onSelectedProviderIdsChange: (ids: string[]) => void;
  fields: OcrFields;
  onFieldChange: (key: keyof OcrFields, value: any) => void;
  onStartSearch: () => void;
  isSearching: boolean;
}

export function WarrantySearchConfig({
  searchMode,
  onSearchModeChange,
  allProviders,
  selectedProviderIds,
  onSelectedProviderIdsChange,
  fields,
  onFieldChange,
  onStartSearch,
  isSearching,
}: WarrantySearchConfigProps) {
  // Compute preview sources dynamically
  const previewSources = useMemo(() => {
    switch (searchMode) {
      case 'SELECTED': {
        const selected = allProviders.filter((p) => selectedProviderIds.includes(p.id));
        const unselected = allProviders.filter((p) => !selectedProviderIds.includes(p.id));
        return { selected, unselected };
      }

      case 'MANUFACTURER': {
        const mfg = allProviders.filter((p) => p.type === 'MANUFACTURER');
        const brand = fields.brand?.toLowerCase().trim();
        const selected = brand
          ? mfg.filter(
              (p) =>
                p.name.toLowerCase().includes(brand) ||
                p.supportedBrands?.some((b) => b.toLowerCase().includes(brand))
            )
          : mfg;
        const unselected = allProviders.filter((p) => !selected.some((s) => s.id === p.id));
        return { selected: selected.length > 0 ? selected : mfg, unselected };
      }

      case 'DISTRIBUTOR': {
        const dist = allProviders.filter((p) => p.type === 'DISTRIBUTOR');
        const distName = fields.distributor?.toLowerCase().trim();
        const selected = distName
          ? dist.filter(
              (p) =>
                p.name.toLowerCase().includes(distName) ||
                distName.includes(p.id)
            )
          : dist;
        const unselected = allProviders.filter((p) => !selected.some((s) => s.id === p.id));
        return { selected: selected.length > 0 ? selected : dist, unselected };
      }

      case 'MANUFACTURER_DISTRIBUTOR': {
        const brand = fields.brand?.toLowerCase().trim();
        const distName = fields.distributor?.toLowerCase().trim();

        const selectedMfg = allProviders.filter((p) =>
          p.type === 'MANUFACTURER' &&
          (brand ? p.name.toLowerCase().includes(brand) || p.supportedBrands?.some((b) => b.toLowerCase().includes(brand)) : true)
        );

        const selectedDist = allProviders.filter((p) =>
          p.type === 'DISTRIBUTOR' &&
          (distName ? p.name.toLowerCase().includes(distName) || distName.includes(p.id) : true)
        );

        const selected = [...selectedMfg, ...selectedDist];
        const unselected = allProviders.filter((p) => !selected.some((s) => s.id === p.id));
        return { selected, unselected };
      }

      case 'ALL': {
        return { selected: allProviders, unselected: [] };
      }

      case 'AUTO':
      default: {
        const brand = fields.brand?.toLowerCase().trim();
        const distName = fields.distributor?.toLowerCase().trim();

        const matched = allProviders.filter((p) => {
          if (p.type === 'MANUFACTURER' && brand) {
            return (
              p.name.toLowerCase().includes(brand) ||
              p.supportedBrands?.some((b) => b.toLowerCase().includes(brand))
            );
          }
          if (p.type === 'DISTRIBUTOR' && distName) {
            return (
              p.name.toLowerCase().includes(distName) ||
              distName.includes(p.id)
            );
          }
          return false;
        });

        const selected =
          matched.length > 0
            ? matched
            : allProviders.filter((p) => ['asus', 'gigabyte', 'mai_hoang', 'synnex_fpt'].includes(p.id));
        const unselected = allProviders.filter((p) => !selected.some((s) => s.id === p.id));
        return { selected, unselected };
      }
    }
  }, [searchMode, allProviders, selectedProviderIds, fields.brand, fields.distributor]);

  const toggleProvider = (id: string) => {
    if (selectedProviderIds.includes(id)) {
      onSelectedProviderIdsChange(selectedProviderIds.filter((pId) => pId !== id));
    } else {
      onSelectedProviderIdsChange([...selectedProviderIds, id]);
    }
  };

  const selectAllProviders = () => {
    onSelectedProviderIdsChange(allProviders.map((p) => p.id));
  };

  const clearAllProviders = () => {
    onSelectedProviderIdsChange([]);
  };

  const modesList: Array<{ mode: WarrantySearchMode; label: string; desc: string }> = [
    {
      mode: 'AUTO',
      label: 'Tự động phát hiện (Auto Detect)',
      desc: 'Tự động chọn nguồn tra cứu phù hợp nhất dựa trên Hãng và Nhà phân phối',
    },
    {
      mode: 'MANUFACTURER',
      label: 'Hãng sản xuất (Manufacturer)',
      desc: 'Chỉ tra cứu trên các cổng thông tin chính thức của Hãng sản xuất',
    },
    {
      mode: 'DISTRIBUTOR',
      label: 'Nhà phân phối (Distributor)',
      desc: 'Chỉ tra cứu trên hệ thống Nhà phân phối tại Việt Nam (Mai Hoàng, FPT, Digiworld...)',
    },
    {
      mode: 'MANUFACTURER_DISTRIBUTOR',
      label: 'Hãng + Nhà phân phối (Manufacturer + Distributor)',
      desc: 'Tra cứu đồng thời cả Hãng và Nhà phân phối tương ứng (Độ chính xác cao nhất)',
    },
    {
      mode: 'SELECTED',
      label: 'Chọn nguồn thủ công (Selected Providers)',
      desc: 'Tự chọn danh sách các nhà cung cấp cần kiểm tra trong bảng danh mục',
    },
    {
      mode: 'ALL',
      label: 'Tra cứu tất cả (Search All)',
      desc: 'Quét toàn bộ 15 đơn vị Hãng & Nhà phân phối được hệ thống hỗ trợ',
    },
  ];

  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 md:p-6 shadow-sm space-y-6 animate-fade-in">
      <div className="flex items-center gap-2.5 pb-4 border-b border-[rgb(var(--border))]">
        <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-[rgb(var(--foreground))]">
            CẤU HÌNH TÌM KIẾM BẢO HÀNH
          </h3>
          <p className="text-xs text-[rgb(var(--muted-foreground))]">
            Lựa chọn chế độ và phạm vi tra cứu nhà cung cấp trước khi kích hoạt tìm kiếm
          </p>
        </div>
      </div>

      {/* Mode Selectors */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-[rgb(var(--foreground))] uppercase tracking-wider">
          Chế độ tìm kiếm (Search Method):
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {modesList.map((item) => (
            <label
              key={item.mode}
              onClick={() => onSearchModeChange(item.mode)}
              className={cn(
                'flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all',
                searchMode === item.mode
                  ? 'border-[rgb(var(--primary))] bg-[rgb(var(--primary))]/5 shadow-sm'
                  : 'border-[rgb(var(--border))] hover:bg-[rgb(var(--muted))]/50'
              )}
            >
              <input
                type="radio"
                name="searchMode"
                value={item.mode}
                checked={searchMode === item.mode}
                onChange={() => onSearchModeChange(item.mode)}
                className="mt-1 text-[rgb(var(--primary))]"
              />
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-[rgb(var(--foreground))]">
                  {item.label}
                </div>
                <div className="text-xs text-[rgb(var(--muted-foreground))] leading-relaxed">
                  {item.desc}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Conditional Inputs Based on Mode */}
      {(searchMode === 'MANUFACTURER' || searchMode === 'MANUFACTURER_DISTRIBUTOR') && (
        <div className="p-4 rounded-xl bg-[rgb(var(--background))] border border-[rgb(var(--border))] space-y-2">
          <label className="text-xs font-semibold text-[rgb(var(--foreground))] flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-blue-500" />
            Hãng sản xuất chỉ định:
          </label>
          <select
            value={fields.brand || 'ASUS'}
            onChange={(e) => onFieldChange('brand', e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] text-sm font-medium"
          >
            {HARDWARE_MANUFACTURERS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      )}

      {(searchMode === 'DISTRIBUTOR' || searchMode === 'MANUFACTURER_DISTRIBUTOR') && (
        <div className="p-4 rounded-xl bg-[rgb(var(--background))] border border-[rgb(var(--border))] space-y-2">
          <label className="text-xs font-semibold text-[rgb(var(--foreground))] flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-emerald-500" />
            Nhà phân phối chỉ định:
          </label>
          <select
            value={fields.distributor || 'Mai Hoàng'}
            onChange={(e) => onFieldChange('distributor', e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] text-sm font-medium"
          >
            {VIETNAM_DISTRIBUTORS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Multi-Select Providers Checkbox Grid */}
      {searchMode === 'SELECTED' && (
        <div className="p-4 rounded-xl bg-[rgb(var(--background))] border border-[rgb(var(--border))] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[rgb(var(--foreground))]">
              Chọn danh sách nhà cung cấp cần tra cứu:
            </span>
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={selectAllProviders}
                className="text-[rgb(var(--primary))] hover:underline font-medium"
              >
                Chọn tất cả ({allProviders.length})
              </button>
              <button
                type="button"
                onClick={clearAllProviders}
                className="text-[rgb(var(--muted-foreground))] hover:underline"
              >
                Bỏ chọn
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
            {allProviders.map((provider) => {
              const isChecked = selectedProviderIds.includes(provider.id);
              return (
                <div
                  key={provider.id}
                  onClick={() => toggleProvider(provider.id)}
                  className={cn(
                    'p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-colors',
                    isChecked
                      ? 'border-[rgb(var(--primary))] bg-[rgb(var(--primary))]/10 font-medium text-[rgb(var(--primary))]'
                      : 'border-[rgb(var(--border))] hover:bg-[rgb(var(--muted))] text-[rgb(var(--foreground))]'
                  )}
                >
                  {isChecked ? (
                    <CheckSquare className="w-4 h-4 text-[rgb(var(--primary))] shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-[rgb(var(--muted-foreground))] shrink-0" />
                  )}
                  <span className="truncate">{provider.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SEARCH PREVIEW BOX */}
      <div className="p-4 rounded-xl bg-[rgb(var(--muted))]/50 border border-[rgb(var(--border))] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[rgb(var(--foreground))] uppercase tracking-wide">
            <Info className="w-4 h-4 text-[rgb(var(--primary))]" />
            DỰ KIẾN NGUỒN TRA CỨU (SEARCH PREVIEW)
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))] font-medium">
            Dự kiến: {previewSources.selected.length} nguồn
          </span>
        </div>

        <div className="text-xs text-[rgb(var(--muted-foreground))]">
          Số Serial: <strong className="font-mono text-[rgb(var(--foreground))]">{fields.serialNumber || 'Chưa nhập'}</strong> | Hãng:{' '}
          <strong className="text-[rgb(var(--foreground))]">{fields.brand || 'Tự động'}</strong> | Nhà phân phối:{' '}
          <strong className="text-[rgb(var(--foreground))]">{fields.distributor || 'Tự động'}</strong>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {/* Selected sources */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              ✓ Nguồn sẽ được kiểm tra ({previewSources.selected.length}):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {previewSources.selected.length > 0 ? (
                previewSources.selected.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  >
                    ✓ {p.name}
                  </span>
                ))
              ) : (
                <span className="text-xs text-red-500 italic">Chưa chọn nguồn nào</span>
              )}
            </div>
          </div>

          {/* Unselected sources */}
          {previewSources.unselected.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-[rgb(var(--muted-foreground))]">
                ○ Nguồn bỏ qua ({previewSources.unselected.length}):
              </div>
              <div className="flex flex-wrap gap-1.5 opacity-60">
                {previewSources.unselected.slice(0, 8).map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))]"
                  >
                    ○ {p.name}
                  </span>
                ))}
                {previewSources.unselected.length > 8 && (
                  <span className="text-[11px] text-[rgb(var(--muted-foreground))] self-center">
                    +{previewSources.unselected.length - 8} nguồn khác
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="text-[11px] text-[rgb(var(--muted-foreground))] italic pt-1 border-t border-[rgb(var(--border))]/50">
          * Khung Search Preview chỉ hiển thị cấu hình nguồn dự kiến, KHÔNG thực hiện tra cứu.
        </div>
      </div>

      {/* ABSOLUTE SEARCH TRIGGER BUTTON */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onStartSearch}
          disabled={isSearching || !fields.serialNumber || !fields.serialNumber.trim()}
          className={cn(
            'w-full py-3.5 px-6 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2.5 shadow-lg',
            !fields.serialNumber || !fields.serialNumber.trim()
              ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/25 active:scale-[0.99]'
          )}
        >
          <Search className="w-5 h-5 animate-bounce" />
          {isSearching ? 'ĐANG KẾT NỐI & TRA CỨU CÁC NGUỒN...' : '🔎 TÌM BẢO HÀNH'}
        </button>
      </div>
    </div>
  );
}
