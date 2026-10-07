import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Sparkles } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import type {
  WarrantyWorkflowState,
  WarrantySearchMode,
  OcrFields,
  ProviderItem,
  AggregatedResult,
} from '@/types/warranty';
import { WarrantyOcrUpload } from './WarrantyOcrUpload';
import { WarrantyOcrReviewForm } from './WarrantyOcrReviewForm';
import { WarrantySearchConfig } from './WarrantySearchConfig';
import { WarrantySearchProgress } from './WarrantySearchProgress';
import { WarrantyResultCard } from './WarrantyResultCard';

interface WarrantyLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSerial?: string;
  initialBrand?: string;
  onApplyWarranty?: (info: {
    serialNumber: string;
    warrantyEndDate?: string;
    remainingDays?: number;
    supplierName?: string;
  }) => void;
}

export function WarrantyLookupModal({
  isOpen,
  onClose,
  initialSerial,
  initialBrand,
  onApplyWarranty,
}: WarrantyLookupModalProps) {
  const [workflowState, setWorkflowState] = useState<WarrantyWorkflowState>('IDLE');
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [ocrFields, setOcrFields] = useState<OcrFields>({
    serialNumber: initialSerial || '',
    brand: initialBrand || '',
    productType: 'VGA',
  });
  const [isOcrConfirmed, setIsOcrConfirmed] = useState(false);
  const [searchMode, setSearchMode] = useState<WarrantySearchMode>('AUTO');
  const [allProviders, setAllProviders] = useState<ProviderItem[]>([]);
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([]);
  const [searchResult, setSearchResult] = useState<AggregatedResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Load available providers
  useEffect(() => {
    if (isOpen) {
      api
        .get('/warranty/providers')
        .then((res) => {
          if (res.data?.success) {
            setAllProviders(res.data.data);
          }
        })
        .catch((err) => console.error('Lỗi tải danh sách providers:', err));
    }
  }, [isOpen]);

  // Init initial serial
  useEffect(() => {
    if (initialSerial) {
      setOcrFields((prev) => ({
        ...prev,
        serialNumber: initialSerial,
        brand: initialBrand || prev.brand,
      }));
      setWorkflowState('READY_TO_SEARCH');
      setIsOcrConfirmed(true);
    }
  }, [initialSerial, initialBrand]);

  if (!isOpen) return null;

  // 1. Stage 1: Upload & Image OCR
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
        setOcrFields(fields);
        setIsOcrConfirmed(false);
        setWorkflowState('OCR_COMPLETED');
        toast.success('Nhận dạng ảnh hoàn tất. Vui lòng kiểm tra lại thông tin.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi nhận dạng ảnh OCR');
      setWorkflowState('IDLE');
    }
  };

  const handleSkipOcr = () => {
    setSelectedPreview(null);
    setWorkflowState('READY_TO_SEARCH');
    setIsOcrConfirmed(true);
  };

  const handleClearImage = () => {
    setSelectedPreview(null);
    setWorkflowState('IDLE');
    setIsOcrConfirmed(false);
  };

  // 2. Stage 3: Confirm OCR Data (MUST NOT SEARCH WARRANTY)
  const handleConfirmOcr = async () => {
    try {
      if (sessionId) {
        await api.post(`/warranty/ocr/${sessionId}/confirm`, {
          confirmedFields: ocrFields,
        });
      }
      setIsOcrConfirmed(true);
      setWorkflowState('READY_TO_SEARCH');
      toast.success('Đã xác nhận dữ liệu OCR! Sẵn sàng cấu hình tìm kiếm.');
    } catch (err: any) {
      setIsOcrConfirmed(true);
      setWorkflowState('READY_TO_SEARCH');
    }
  };

  // 3. Absolute Search Trigger (ONLY when user clicks "TÌM BẢO HÀNH")
  const handleStartSearch = async () => {
    if (!ocrFields.serialNumber || !ocrFields.serialNumber.trim()) {
      toast.error('Vui lòng nhập số Serial Number');
      return;
    }

    try {
      setIsSearching(true);
      setWorkflowState('SEARCHING');

      const res = await api.post('/warranty/search', {
        sessionId,
        searchMode,
        serialNumber: ocrFields.serialNumber.trim(),
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

  const handleReset = () => {
    setWorkflowState('IDLE');
    setSelectedPreview(null);
    setSearchResult(null);
    setIsOcrConfirmed(false);
    setOcrFields({ productType: 'VGA' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[rgb(var(--border))] shrink-0 bg-[rgb(var(--muted))]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[rgb(var(--foreground))]">
                Tra Cứu Bảo Hành Thiết Bị & Quét Tem OCR
              </h2>
              <p className="text-xs text-[rgb(var(--muted-foreground))]">
                Quy trình tách bạch: Quét tem OCR ➔ Xác nhận dữ liệu ➔ Cấu hình & Bấm tìm kiếm
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {/* STEP 1: Upload (always visible or expandable) */}
          {workflowState !== 'COMPLETED' && (
            <WarrantyOcrUpload
              onImageSelected={handleImageSelected}
              onSkipOcr={handleSkipOcr}
              isProcessing={workflowState === 'OCR_PROCESSING'}
              selectedPreview={selectedPreview}
              onClearImage={handleClearImage}
            />
          )}

          {/* STEP 2: OCR Processing Spinner */}
          {workflowState === 'OCR_PROCESSING' && (
            <div className="py-8 text-center space-y-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]">
              <div className="w-12 h-12 rounded-2xl bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))] flex items-center justify-center mx-auto animate-spin">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="text-sm font-semibold text-[rgb(var(--foreground))]">
                Gemini Vision đang phân tích nhãn tem & mã vạch...
              </div>
              <div className="text-xs text-[rgb(var(--muted-foreground))]">
                Hệ thống chỉ nhận diện ký tự quang học, hoàn toàn không gửi yêu cầu tra cứu bảo hành.
              </div>
            </div>
          )}

          {/* STEP 3: Review Form (when OCR completed or manually skipping) */}
          {(workflowState === 'OCR_COMPLETED' ||
            workflowState === 'REVIEWING' ||
            workflowState === 'READY_TO_SEARCH') && (
            <WarrantyOcrReviewForm
              fields={ocrFields}
              onChange={setOcrFields}
              onConfirm={handleConfirmOcr}
              onRescan={handleReset}
              isConfirmed={isOcrConfirmed}
              confidence={ocrFields.confidence}
            />
          )}

          {/* STEP 4: Search Configuration & Preview */}
          {(workflowState === 'READY_TO_SEARCH' || workflowState === 'SEARCHING') && (
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
          )}

          {/* STEP 5: Searching Progress */}
          {workflowState === 'SEARCHING' && (
            <WarrantySearchProgress
              serialNumber={ocrFields.serialNumber || ''}
              totalQueried={allProviders.length}
              isSearching={isSearching}
            />
          )}

          {/* STEP 6: Result Card */}
          {workflowState === 'COMPLETED' && searchResult && (
            <WarrantyResultCard
              result={searchResult}
              onResetSearch={handleReset}
              onApplyToInventory={
                onApplyWarranty
                  ? (r) => {
                      onApplyWarranty({
                        serialNumber: r.serialNumber,
                        warrantyEndDate: r.warrantyEndDate ? new Date(r.warrantyEndDate).toISOString() : undefined,
                        remainingDays: r.remainingDays,
                        supplierName: r.primaryResult?.providerName,
                      });
                      onClose();
                    }
                  : undefined
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
