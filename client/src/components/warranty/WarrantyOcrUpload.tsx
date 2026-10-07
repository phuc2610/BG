import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Camera, Image as ImageIcon, X, AlertCircle, Sparkles, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WarrantyOcrUploadProps {
  onImageSelected: (file: File) => void;
  onSkipOcr: () => void;
  isProcessing: boolean;
  selectedPreview?: string | null;
  onClearImage?: () => void;
}

export function WarrantyOcrUpload({
  onImageSelected,
  onSkipOcr,
  isProcessing,
  selectedPreview,
  onClearImage,
}: WarrantyOcrUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Support paste from clipboard (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isProcessing) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            onImageSelected(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isProcessing, onImageSelected]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isProcessing) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isProcessing) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onImageSelected(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageSelected(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && !selectedPreview && fileInputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed rounded-2xl p-6 md:p-8 text-center transition-all duration-200',
          selectedPreview
            ? 'border-[rgb(var(--primary))] bg-[rgb(var(--primary))]/5 cursor-default'
            : isDragging
            ? 'border-[rgb(var(--primary))] bg-[rgb(var(--primary))]/10 cursor-pointer shadow-lg'
            : 'border-[rgb(var(--border))] hover:border-[rgb(var(--primary))]/70 hover:bg-[rgb(var(--muted))]/50 cursor-pointer',
          isProcessing && 'opacity-70 pointer-events-none'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={isProcessing}
        />

        {selectedPreview ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative group max-w-sm rounded-xl overflow-hidden border border-[rgb(var(--border))] shadow-md">
              <img
                src={selectedPreview}
                alt="Tem nhãn sản phẩm"
                className="w-full max-h-56 object-contain bg-black/5"
              />
              {!isProcessing && onClearImage && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearImage();
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors shadow"
                  title="Xóa ảnh"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-[rgb(var(--muted-foreground))]">
              <ImageIcon className="w-4 h-4 text-[rgb(var(--primary))]" />
              <span>Ảnh tem / hộp thiết bị đã được tải lên</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-3 py-3">
            <div className="w-14 h-14 rounded-2xl bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))] flex items-center justify-center shadow-inner">
              <UploadCloud className="w-7 h-7 animate-pulse" />
            </div>

            <div>
              <p className="text-base font-semibold text-[rgb(var(--foreground))]">
                Kéo thả ảnh tem hoặc <span className="text-[rgb(var(--primary))] hover:underline">chọn file</span>
              </p>
              <p className="text-xs text-[rgb(var(--muted-foreground))] mt-1">
                Hỗ trợ ảnh chụp nhãn hộp, tem Serial, mã vạch S/N hoặc nhấn <kbd className="px-1.5 py-0.5 rounded bg-[rgb(var(--muted))] border text-[11px] font-mono">Ctrl + V</kbd> để dán ảnh
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))]">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Gemini Vision OCR trích xuất thông tin
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Manual Search Button (Skip OCR) */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className="text-[rgb(var(--muted-foreground))] flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 text-blue-500" />
          OCR chỉ nhận diện chữ trên ảnh, không tự động kiểm tra bảo hành
        </span>

        <button
          type="button"
          onClick={onSkipOcr}
          disabled={isProcessing}
          className="text-[rgb(var(--primary))] hover:underline font-medium inline-flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-[rgb(var(--primary))]/10 transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5" />
          Nhập Serial thủ công (Bỏ qua OCR)
        </button>
      </div>
    </div>
  );
}
