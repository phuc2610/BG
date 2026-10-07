import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  Trash2,
  Loader2,
  Check,
  RefreshCw,
  X,
  Eye,
  AlertCircle,
  ClipboardPaste,
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface ProductAiImagePickerProps {
  imageUrl?: string;
  onChange: (url: string, publicId?: string) => void;
  productName?: string;
  category?: string;
  brand?: string;
  model?: string;
  compact?: boolean;
}

export function ProductAiImagePicker({
  imageUrl,
  onChange,
  productName = '',
  category = '',
  brand = '',
  model = '',
  compact = false,
}: ProductAiImagePickerProps) {
  const [showAiModal, setShowAiModal] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState('');
  const [previewZoomUrl, setPreviewZoomUrl] = useState<string | null>(null);

  // AI Modal states
  const [generating, setGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedAiIndex, setSelectedAiIndex] = useState<number | null>(null);
  const [savingAiImage, setSavingAiImage] = useState(false);
  const [uploadingDirect, setUploadingDirect] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Trigger Open AI Modal
  const handleOpenAiModal = () => {
    if (!productName || !productName.trim()) {
      toast.error('Vui lòng nhập Tên Linh Kiện / Sản Phẩm trước khi tạo ảnh AI!', {
        icon: '⚠️',
        duration: 4000,
      });
      return;
    }

    setShowAiModal(true);
    if (generatedImages.length === 0) {
      handleGenerateImages();
    }
  };

  // Generate 3 images from OpenAI API
  const handleGenerateImages = async () => {
    if (!productName || !productName.trim()) {
      toast.error('Vui lòng nhập Tên sản phẩm');
      return;
    }

    setGenerating(true);
    setSelectedAiIndex(null);
    try {
      const res = await api.post(
        '/ai/generate-product-images',
        {
          name: productName.trim(),
          category,
          brand,
          model,
          customPrompt: customPrompt.trim() || undefined,
        },
        { timeout: 180000 }
      );

      if (res.data.success && res.data.data?.images?.length > 0) {
        setGeneratedImages(res.data.data.images);
        setSelectedAiIndex(0); // auto select first option
        toast.success(`Đã tạo thành công ${res.data.data.images.length} biến thể ảnh AI!`);
      } else {
        toast.error('Không nhận được ảnh từ AI. Vui lòng thử lại.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi gọi OpenAI API';
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  // Save selected AI image permanently to server
  const handleConfirmAiImage = async (imgUrlToSave?: string) => {
    const targetUrl = imgUrlToSave || (selectedAiIndex !== null ? generatedImages[selectedAiIndex] : null);
    if (!targetUrl) {
      toast.error('Vui lòng click chọn 1 trong các ảnh đã tạo');
      return;
    }

    setSavingAiImage(true);
    try {
      const res = await api.post(
        '/ai/save-generated-image',
        {
          imageUrl: targetUrl,
          productName: productName.trim(),
        },
        { timeout: 60000 }
      );

      if (res.data.success && res.data.data?.url) {
        onChange(res.data.data.url, res.data.data.publicId);
        toast.success('Đã lưu và áp dụng ảnh AI cho sản phẩm!');
        setShowAiModal(false);
      } else {
        toast.error('Không thể lưu ảnh vào hệ thống');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi lưu ảnh AI';
      toast.error(msg);
    } finally {
      setSavingAiImage(false);
    }
  };

  // Upload file helper
  const uploadImageFile = async (file: File) => {
    setUploadingDirect(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await api.post('/ai/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success && res.data.data?.url) {
        onChange(res.data.data.url, res.data.data.publicId);
        toast.success('Đã tải ảnh lên thành công!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi tải ảnh lên');
    } finally {
      setUploadingDirect(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Direct File Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImageFile(file);
  };

  // Set Manual URL
  const handleApplyUrl = (customUrl?: string) => {
    const target = (customUrl !== undefined ? customUrl : urlInputValue).trim();
    if (!target) return;
    onChange(target);
    setUrlInputValue('');
    setShowUrlInput(false);
    toast.success('Đã gắn link ảnh sản phẩm!');
  };

  // Handle Clipboard Paste (Ctrl+V event)
  const handlePasteEvent = useCallback(
    async (e: React.ClipboardEvent | ClipboardEvent) => {
      // 1. Check for image files in clipboard
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
              e.preventDefault();
              toast.loading('Đang xử lý ảnh từ Clipboard...', { id: 'paste-img' });
              await uploadImageFile(file);
              toast.dismiss('paste-img');
              return;
            }
          }
        }
      }

      // 2. Check for image URL text in clipboard
      const text = e.clipboardData?.getData('text')?.trim();
      if (text && (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('data:image/'))) {
        e.preventDefault();
        onChange(text);
        setUrlInputValue('');
        setShowUrlInput(false);
        toast.success('Đã dán và gắn link ảnh từ Clipboard!');
      }
    },
    [onChange]
  );

  // Fast One-Click Paste from System Clipboard (Button)
  const handlePasteFromClipboardButton = async () => {
    try {
      // Try to read clipboard items (supports images & text)
      if (navigator.clipboard && navigator.clipboard.read) {
        try {
          const clipboardItems = await navigator.clipboard.read();
          for (const item of clipboardItems) {
            const imageType = item.types.find((type) => type.startsWith('image/'));
            if (imageType) {
              const blob = await item.getType(imageType);
              const file = new File([blob], `pasted_image_${Date.now()}.png`, { type: imageType });
              toast.loading('Đang tải ảnh từ Clipboard...', { id: 'paste-img' });
              await uploadImageFile(file);
              toast.dismiss('paste-img');
              return;
            }
          }
        } catch (e) {
          console.log('Clipboard read image not permitted, falling back to text read:', e);
        }
      }

      // Fallback to readText
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = (await navigator.clipboard.readText()).trim();
        if (text) {
          if (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('data:image/')) {
            onChange(text);
            setShowUrlInput(false);
            toast.success('Đã dán link ảnh từ Clipboard thành công!');
            return;
          } else {
            setUrlInputValue(text);
            setShowUrlInput(true);
            toast('Đã dán nội dung vào ô nhập URL. Bấm "Gắn link" để áp dụng.', { icon: 'ℹ️' });
            return;
          }
        }
      }

      // If cannot read directly, toggle input for user to press Ctrl+V
      setShowUrlInput(true);
      setTimeout(() => urlInputRef.current?.focus(), 50);
      toast('Vui lòng nhấn Ctrl+V vào ô bên dưới để dán link!', { icon: '⌨️' });
    } catch (err) {
      setShowUrlInput(true);
      setTimeout(() => urlInputRef.current?.focus(), 50);
      toast('Vui lòng nhấn Ctrl+V vào ô bên dưới để dán link', { icon: '⌨️' });
    }
  };

  // Focus URL input when toggled open
  useEffect(() => {
    if (showUrlInput) {
      setTimeout(() => {
        urlInputRef.current?.focus();
        urlInputRef.current?.select();
      }, 50);
    }
  }, [showUrlInput]);

  return (
    <div
      ref={containerRef}
      onPaste={handlePasteEvent}
      className="space-y-3 outline-none"
      tabIndex={0}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Current Image Preview Box */}
        <div className="relative group shrink-0">
          {imageUrl ? (
            <div
              className={`relative rounded-2xl overflow-hidden border border-[rgb(var(--border))] bg-[rgb(var(--muted))] shadow-sm ${
                compact ? 'w-20 h-20' : 'w-28 h-28'
              }`}
            >
              <img
                src={imageUrl}
                alt={productName || 'Ảnh sản phẩm'}
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewZoomUrl(imageUrl)}
                  className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white"
                  title="Xem phóng to"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onChange('', '')}
                  className="p-1.5 rounded-lg bg-red-500/80 hover:bg-red-600 text-white"
                  title="Xóa ảnh"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`rounded-2xl border-2 border-dashed border-[rgb(var(--border))] bg-[rgb(var(--muted))]/30 flex flex-col items-center justify-center text-[rgb(var(--muted-foreground))] ${
                compact ? 'w-20 h-20 text-[10px]' : 'w-28 h-28 text-xs'
              }`}
            >
              <ImageIcon className={compact ? 'w-5 h-5 mb-1 opacity-40' : 'w-7 h-7 mb-1.5 opacity-40'} />
              <span>Chưa có ảnh</span>
            </div>
          )}
        </div>

        {/* Action Buttons Group */}
        <div className="flex-1 space-y-2 w-full">
          <div className="flex items-center gap-2 flex-wrap">
            {/* AI Generator Button (Primary Highlight) */}
            <button
              type="button"
              onClick={handleOpenAiModal}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-md shadow-indigo-500/25 inline-flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>Tạo ảnh tự động AI (3 mẫu)</span>
            </button>

            {/* Fast Paste (Ctrl+V) from Clipboard */}
            <button
              type="button"
              onClick={handlePasteFromClipboardButton}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 inline-flex items-center gap-1.5 transition-colors"
              title="Dán nhanh ảnh hoặc link từ bộ nhớ tạm (Ctrl+V)"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-indigo-400" />
              <span>Dán (Ctrl+V)</span>
            </button>

            {/* Direct Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingDirect}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-[rgb(var(--muted))] hover:bg-[rgb(var(--accent))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {uploadingDirect ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5 text-blue-400" />
              )}
              <span>{uploadingDirect ? 'Đang tải lên...' : 'Tải từ máy'}</span>
            </button>

            {/* Paste URL Button */}
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-[rgb(var(--muted))] hover:bg-[rgb(var(--accent))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] inline-flex items-center gap-1.5 transition-colors"
            >
              <LinkIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Link URL</span>
            </button>
          </div>

          {/* Inline Link URL Input */}
          {showUrlInput && (
            <div className="flex items-center gap-2 pt-1 animate-fade-in">
              <div className="relative flex-1">
                <input
                  ref={urlInputRef}
                  type="text"
                  placeholder="Dán link ảnh tại đây (Ctrl+V)..."
                  value={urlInputValue}
                  onChange={(e) => setUrlInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyUrl();
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-[rgb(var(--background))] border border-indigo-500/50 text-[rgb(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
              <button
                type="button"
                onClick={() => handleApplyUrl()}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm"
              >
                Gắn link
              </button>
              <button
                type="button"
                onClick={() => setShowUrlInput(false)}
                className="p-2 text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--accent))] rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <p className="text-[11px] text-[rgb(var(--muted-foreground))]">
            ✨ Hỗ trợ tạo 3 ảnh AI, dán ảnh chụp màn hình trực tiếp bằng <strong>Ctrl+V</strong>, dán link hoặc tải file từ máy.
          </p>
        </div>
      </div>

      {/* AI Image Generation Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[rgb(var(--border))] bg-gradient-to-r from-violet-950/40 via-indigo-950/30 to-purple-950/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                  <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[rgb(var(--foreground))]">
                    Tạo Ảnh Sản Phẩm Bằng AI (OpenAI)
                  </h3>
                  <p className="text-xs text-[rgb(var(--muted-foreground))]">
                    Sản phẩm: <strong className="text-blue-400">{productName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="p-1.5 rounded-lg text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--accent))]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Product Context Card */}
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-[rgb(var(--muted-foreground))]">Tên mã linh kiện:</span>
                  <p className="font-bold text-[rgb(var(--foreground))] text-sm">{productName}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                  {category && <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-semibold">{category}</span>}
                  {brand && <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-semibold">{brand}</span>}
                  {model && <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold">{model}</span>}
                </div>
              </div>

              {/* Generating Loading State */}
              {generating ? (
                <div className="py-12 px-4 text-center space-y-4">
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-ping" />
                    <div className="w-16 h-16 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-indigo-400" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-[rgb(var(--foreground))]">
                      Đang tạo 3 ảnh AI bằng OpenAI...
                    </h4>
                    <p className="text-xs text-[rgb(var(--muted-foreground))] max-w-md mx-auto">
                      Hệ thống đang phân tích tên linh kiện "{productName}" và kết xuất 3 góc chụp studio chân thực. Quá trình này mất khoảng 5-10 giây...
                    </p>
                  </div>

                  {/* Placeholder Skeletons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 max-w-xl mx-auto">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className="aspect-square rounded-2xl bg-[rgb(var(--muted))]/50 border border-[rgb(var(--border))] animate-pulse flex flex-col items-center justify-center p-3 text-center"
                      >
                        <ImageIcon className="w-8 h-8 opacity-20 mb-2" />
                        <span className="text-[10px] text-[rgb(var(--muted-foreground))]">Biến thể {n}...</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : generatedImages.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <p className="text-xs text-[rgb(var(--muted-foreground))] max-w-sm mx-auto">
                    Bấm nút bên dưới để bắt đầu tạo 3 biến thể ảnh sản phẩm AI.
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerateImages}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/25"
                  >
                    Bắt đầu tạo 3 ảnh AI
                  </button>
                </div>
              ) : (
                /* 3 Generated Candidate Images Grid */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[rgb(var(--foreground))]">
                      Chọn 1 trong 3 ảnh bên dưới để gán cho sản phẩm:
                    </span>
                    <button
                      type="button"
                      onClick={handleGenerateImages}
                      disabled={generating}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[rgb(var(--muted))] hover:bg-[rgb(var(--accent))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] inline-flex items-center gap-1.5 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                      <span>Tạo lại 3 ảnh khác</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {generatedImages.map((url, idx) => {
                      const isSelected = selectedAiIndex === idx;

                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedAiIndex(idx)}
                          className={`group relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all duration-200 shadow-md ${
                            isSelected
                              ? 'border-indigo-500 ring-4 ring-indigo-500/20 scale-[1.02] shadow-indigo-500/20'
                              : 'border-[rgb(var(--border))] hover:border-indigo-400/60 bg-[rgb(var(--muted))]'
                          }`}
                        >
                          <div className="aspect-square w-full relative bg-black/40">
                            <img
                              src={url}
                              alt={`Mẫu ${idx + 1}`}
                              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                            />

                            {/* Badge Mẫu # */}
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[10px] font-bold text-white">
                              Mẫu #{idx + 1}
                            </div>

                            {/* Selection Checkmark */}
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md animate-scale-in">
                                <Check className="w-4 h-4" />
                              </div>
                            )}

                            {/* Quick Select Button on Hover */}
                            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between gap-2 opacity-90 group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConfirmAiImage(url);
                                }}
                                disabled={savingAiImage}
                                className="w-full py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all flex items-center justify-center gap-1"
                              >
                                {savingAiImage && isSelected ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                <span>Chọn ảnh này</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-[rgb(var(--border))] bg-[rgb(var(--muted))/20]">
              <span className="text-[11px] text-[rgb(var(--muted-foreground))] flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-indigo-400" />
                <span>Ảnh được tự động lưu vĩnh viễn vào hệ thống</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAiModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--accent))]"
                >
                  Đóng
                </button>
                {generatedImages.length > 0 && selectedAiIndex !== null && (
                  <button
                    type="button"
                    onClick={() => handleConfirmAiImage()}
                    disabled={savingAiImage || generating}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/25 disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {savingAiImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>{savingAiImage ? 'Đang lưu ảnh...' : 'Lưu & Sử Dụng Ảnh Đã Chọn'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Preview Zoom Modal */}
      {previewZoomUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewZoomUrl(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
            <img src={previewZoomUrl} alt="Phóng to ảnh" className="w-full h-full object-contain" />
            <button
              type="button"
              onClick={() => setPreviewZoomUrl(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
