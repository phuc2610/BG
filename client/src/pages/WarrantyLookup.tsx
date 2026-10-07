import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  History,
  Search,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Calendar,
  AlertCircle,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  X,
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import type {
  WarrantyWorkflowState,
  WarrantySearchMode,
  OcrFields,
  ProviderItem,
  AggregatedResult,
} from '@/types/warranty';
import { WarrantyOcrUpload } from '@/components/warranty/WarrantyOcrUpload';
import { WarrantySearchConfig } from '@/components/warranty/WarrantySearchConfig';
import { WarrantySearchProgress } from '@/components/warranty/WarrantySearchProgress';
import { WarrantyResultCard } from '@/components/warranty/WarrantyResultCard';
import { formatDate, cn } from '@/lib/utils';

export function WarrantyLookup() {
  const [activeTab, setActiveTab] = useState<'lookup' | 'history'>('lookup');

  // Workflow & Search State
  const [workflowState, setWorkflowState] = useState<WarrantyWorkflowState>('IDLE');
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [ocrFields, setOcrFields] = useState<OcrFields>({ serialNumber: '' });
  const [showOcrUpload, setShowOcrUpload] = useState(false);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);

  // Search Config
  const [searchMode, setSearchMode] = useState<WarrantySearchMode>('AUTO');
  const [allProviders, setAllProviders] = useState<ProviderItem[]>([]);
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([]);
  const [searchResult, setSearchResult] = useState<AggregatedResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // History Tab
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [selectedHistoryDetail, setSelectedHistoryDetail] = useState<any | null>(null);

  // Load Providers list on mount
  useEffect(() => {
    api
      .get('/warranty/providers')
      .then((res) => {
        if (res.data?.success) {
          setAllProviders(res.data.data);
        }
      })
      .catch((err) => console.error('Lỗi tải danh sách providers:', err));
  }, []);

  // Fetch History
  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await api.get('/warranty/history', {
        params: { search: historySearch, limit: 50 },
      });
      if (res.data?.success) {
        setHistoryList(res.data.data);
      }
    } catch (err: any) {
      toast.error('Lỗi tải lịch sử tra cứu');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, historySearch]);

  // STAGE 1: IMAGE OCR (Trích xuất Serial từ ảnh tem nhãn)
  const handleImageSelected = async (file: File) => {
    try {
      const previewUrl = URL.createObjectURL(file);
      setSelectedPreview(previewUrl);
      setWorkflowState('OCR_PROCESSING');

      const formData = new FormData();
      formData.append('image', file);

      const res = await api.post('/warranty/ocr', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        const { sessionId: sId, fields } = res.data.data;
        setSessionId(sId);
        setOcrFields((prev) => ({
          ...prev,
          serialNumber: fields.serialNumber || prev.serialNumber || '',
          brand: fields.brand || prev.brand,
          model: fields.model || prev.model,
          partNumber: fields.partNumber || prev.partNumber,
          distributor: fields.distributor || prev.distributor,
          productType: fields.productType || prev.productType,
        }));
        setWorkflowState('IDLE');
        if (fields.serialNumber) {
          toast.success(`Đã nhận diện Serial Number: ${fields.serialNumber}`);
        } else {
          toast('Đã đọc ảnh, vui lòng kiểm tra hoặc nhập số Serial bên dưới.', { icon: 'ℹ️' });
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi nhận dạng ảnh OCR');
      setWorkflowState('IDLE');
    }
  };

  const handleClearImage = () => {
    setSelectedPreview(null);
    setSessionId(undefined);
  };

  // ABSOLUTE SEARCH TRIGGER (Chỉ cần có số Serial là tra cứu ngay lập tức)
  const handleStartSearch = async () => {
    const cleanSerial = ocrFields.serialNumber?.trim();
    if (!cleanSerial) {
      toast.error('Vui lòng nhập số Serial Number trước khi tra cứu');
      return;
    }

    try {
      setIsSearching(true);
      setWorkflowState('SEARCHING');

      const res = await api.post('/warranty/search', {
        sessionId,
        searchMode,
        serialNumber: cleanSerial,
        brand: ocrFields.brand,
        model: ocrFields.model,
        partNumber: ocrFields.partNumber,
        distributor: ocrFields.distributor,
        productType: ocrFields.productType,
        selectedProviderIds,
      });

      if (res.data?.success) {
        setSearchResult(res.data.data);
        setWorkflowState('COMPLETED');
        toast.success('Tra cứu bảo hành hoàn tất!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi tra cứu bảo hành');
      setWorkflowState('FAILED');
    } finally {
      setIsSearching(false);
    }
  };

  const handleResetSearch = () => {
    setWorkflowState('IDLE');
    setSelectedPreview(null);
    setSearchResult(null);
    setOcrFields({ serialNumber: '' });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[rgb(var(--foreground))] flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-[rgb(var(--primary))]" />
            Tra Cứu Bảo Hành Thiết Bị & Quét Tem OCR
          </h1>
          <p className="text-sm text-[rgb(var(--muted-foreground))] mt-1">
            Chỉ cần nhập số Serial Number (S/N) — Hệ thống tự động tra cứu xuyên suốt 24 Hãng & Nhà phân phối
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[rgb(var(--muted))] border border-[rgb(var(--border))] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('lookup')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2',
              activeTab === 'lookup'
                ? 'bg-[rgb(var(--card))] text-[rgb(var(--foreground))] shadow-sm'
                : 'text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]'
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Tra cứu trực tiếp
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2',
              activeTab === 'history'
                ? 'bg-[rgb(var(--card))] text-[rgb(var(--foreground))] shadow-sm'
                : 'text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]'
            )}
          >
            <History className="w-3.5 h-3.5 text-blue-500" />
            Lịch sử tra cứu
          </button>
        </div>
      </div>

      {activeTab === 'lookup' ? (
        <div className="space-y-6">
          {/* PRIMARY DIRECT SEARCH FORM */}
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 md:p-8 shadow-sm space-y-5">
            <div>
              <label className="text-sm font-bold text-[rgb(var(--foreground))] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[rgb(var(--primary))]" />
                SỐ SERIAL NUMBER (S/N) THIẾT BỊ CẦN TRA CỨU
              </label>
              <p className="text-xs text-[rgb(var(--muted-foreground))] mt-1">
                Nhập hoặc dán số Serial Number — Không bắt buộc bất kỳ thông tin nào khác, hệ thống sẽ tự động quét tất cả các nguồn tương ứng.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={ocrFields.serialNumber || ''}
                  onChange={(e) =>
                    setOcrFields((prev) => ({
                      ...prev,
                      serialNumber: e.target.value.toUpperCase(),
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleStartSearch();
                  }}
                  placeholder="Nhập hoặc dán số Serial... (VD: SAYVYZ01R574BEN, 234567890123...)"
                  className="w-full px-4 py-3.5 text-base font-mono font-bold tracking-wider rounded-xl bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] placeholder:text-xs placeholder:font-sans placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))]"
                  autoFocus
                />
                {ocrFields.serialNumber && (
                  <button
                    type="button"
                    onClick={() =>
                      setOcrFields((prev) => ({ ...prev, serialNumber: '' }))
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] hover:bg-[rgb(var(--muted))]"
                    title="Xóa"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleStartSearch}
                disabled={!ocrFields.serialNumber?.trim() || isSearching}
                className={cn(
                  'px-8 py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all shadow-md shrink-0',
                  ocrFields.serialNumber?.trim() && !isSearching
                    ? 'bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary))]/90 hover:shadow-lg active:scale-95'
                    : 'bg-zinc-400 dark:bg-zinc-700 cursor-not-allowed opacity-60'
                )}
              >
                {isSearching ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Tra cứu bảo hành
              </button>
            </div>

            {/* AI Detected Badge (nếu quét từ ảnh) */}
            {ocrFields.serialNumber && (ocrFields.brand || ocrFields.model) && (
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-400 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0 text-blue-500" />
                  <span>
                    Thông tin nhận diện kèm theo: <strong>{ocrFields.brand}</strong>{' '}
                    {ocrFields.model && `— Model: ${ocrFields.model}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setOcrFields({ serialNumber: ocrFields.serialNumber })
                  }
                  className="text-[11px] underline opacity-80 hover:opacity-100"
                >
                  Chỉ giữ lại Serial
                </button>
              </div>
            )}

            {/* Quick Toolbar: Toggle Quét OCR & Bộ lọc mở rộng */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[rgb(var(--border))]">
              <button
                type="button"
                onClick={() => setShowOcrUpload(!showOcrUpload)}
                className="text-xs font-semibold text-[rgb(var(--primary))] hover:underline flex items-center gap-1.5"
              >
                <Camera className="w-4 h-4" />
                {showOcrUpload
                  ? 'Ẩn khung quét ảnh tem nhãn ▲'
                  : '📷 Hoặc chụp / tải ảnh tem để AI tự đọc Serial ▼'}
              </button>

              <button
                type="button"
                onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
                className="text-xs text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] font-medium flex items-center gap-1"
              >
                {showAdvancedConfig
                  ? 'Ẩn bộ lọc Hãng/NPP ▲'
                  : '⚙️ Bộ lọc Hãng/NPP nâng cao (tùy chọn) ▼'}
              </button>
            </div>

            {/* Collapsible OCR Upload Section */}
            {showOcrUpload && (
              <div className="pt-3 border-t border-dashed border-[rgb(var(--border))] space-y-3 animate-fade-in">
                <div className="text-xs font-bold text-[rgb(var(--foreground))] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  KÉO THẢ HOẶC CHỤP ẢNH TEM DÁN (GEMINI VISION OCR TỰ ĐIỀN SERIAL)
                </div>
                <WarrantyOcrUpload
                  onImageSelected={handleImageSelected}
                  onSkipOcr={() => setShowOcrUpload(false)}
                  isProcessing={workflowState === 'OCR_PROCESSING'}
                  selectedPreview={selectedPreview}
                  onClearImage={handleClearImage}
                />
              </div>
            )}

            {/* OCR Processing Indicator */}
            {workflowState === 'OCR_PROCESSING' && (
              <div className="py-6 text-center space-y-2 rounded-xl bg-[rgb(var(--muted))]/40 border border-[rgb(var(--border))] animate-pulse">
                <div className="w-8 h-8 rounded-full bg-[rgb(var(--primary))]/15 text-[rgb(var(--primary))] flex items-center justify-center mx-auto animate-spin">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-[rgb(var(--foreground))]">
                  Gemini Vision đang đọc mã Serial Number trên tem...
                </div>
              </div>
            )}

            {/* Collapsible Advanced Search Config */}
            {showAdvancedConfig && (
              <div className="pt-3 border-t border-dashed border-[rgb(var(--border))] animate-fade-in">
                <WarrantySearchConfig
                  searchMode={searchMode}
                  onSearchModeChange={setSearchMode}
                  allProviders={allProviders}
                  selectedProviderIds={selectedProviderIds}
                  onSelectedProviderIdsChange={setSelectedProviderIds}
                  fields={ocrFields}
                  onFieldChange={(k, v) => setOcrFields((prev) => ({ ...prev, [k]: v }))}
                  onStartSearch={handleStartSearch}
                  isSearching={isSearching}
                />
              </div>
            )}
          </div>

          {/* SEARCHING PROGRESS */}
          {workflowState === 'SEARCHING' && (
            <WarrantySearchProgress
              serialNumber={ocrFields.serialNumber || ''}
              totalQueried={allProviders.length}
              isSearching={isSearching}
            />
          )}

          {/* RESULT CARD */}
          {workflowState === 'COMPLETED' && searchResult && (
            <WarrantyResultCard
              result={searchResult}
              onResetSearch={handleResetSearch}
            />
          )}
        </div>
      ) : (
        /* TAB 2: HISTORY TAB */
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[rgb(var(--muted-foreground))]" />
              <input
                type="text"
                placeholder="Tìm kiếm theo Serial Number, Mã tra cứu, Hãng, NPP..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
              />
            </div>
            <button
              type="button"
              onClick={fetchHistory}
              className="p-2 rounded-xl bg-[rgb(var(--muted))] hover:bg-[rgb(var(--muted))]/80 text-[rgb(var(--foreground))] transition-colors"
              title="Tải lại"
            >
              <RefreshCw className={cn('w-4 h-4', historyLoading && 'animate-spin')} />
            </button>
          </div>

          <div className="border border-[rgb(var(--border))] rounded-2xl bg-[rgb(var(--card))] overflow-hidden overflow-x-auto shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))] uppercase font-semibold border-b border-[rgb(var(--border))]">
                <tr>
                  <th className="p-3.5">Mã tra cứu</th>
                  <th className="p-3.5">Serial Number</th>
                  <th className="p-3.5">Thiết bị</th>
                  <th className="p-3.5">Trạng thái</th>
                  <th className="p-3.5">Hạn bảo hành</th>
                  <th className="p-3.5">Thời gian tra cứu</th>
                  <th className="p-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--border))]">
                {historyLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[rgb(var(--muted-foreground))]">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[rgb(var(--primary))]" />
                      Đang tải lịch sử tra cứu...
                    </td>
                  </tr>
                ) : historyList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[rgb(var(--muted-foreground))]">
                      Chưa có lịch sử tra cứu nào được ghi nhận.
                    </td>
                  </tr>
                ) : (
                  historyList.map((item) => (
                    <tr
                      key={item._id}
                      className="hover:bg-[rgb(var(--muted))]/50 transition-colors"
                    >
                      <td className="p-3.5 font-mono font-bold text-[rgb(var(--primary))]">
                        {item.searchCode}
                      </td>
                      <td className="p-3.5 font-mono font-extrabold text-[rgb(var(--foreground))]">
                        {item.serialNumber}
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-[rgb(var(--foreground))]">
                          {item.brand ? `${item.brand} ` : ''}
                          {item.modelName || item.productType || 'Linh kiện'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px]',
                            item.overallStatus === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : item.overallStatus === 'EXPIRED'
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))]'
                          )}
                        >
                          {item.overallStatus === 'ACTIVE'
                            ? '✓ Còn BH'
                            : item.overallStatus === 'EXPIRED'
                            ? 'Hết hạn'
                            : 'Không tìm thấy'}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-[rgb(var(--foreground))]">
                        {item.warrantyEndDate ? formatDate(item.warrantyEndDate) : '—'}
                      </td>
                      <td className="p-3.5 text-[rgb(var(--muted-foreground))]">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setOcrFields({
                              serialNumber: item.serialNumber,
                              brand: item.brand,
                              model: item.modelName,
                            });
                            setActiveTab('lookup');
                            handleStartSearch();
                          }}
                          className="px-3 py-1 rounded-lg bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))] hover:bg-[rgb(var(--primary))]/20 font-bold transition-colors"
                        >
                          Tra cứu lại
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
