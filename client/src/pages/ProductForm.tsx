import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { ProductCategory } from '@/types';
import type { ProductImage } from '@/types';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';
import {
  ArrowLeft, Save, Upload, Loader2, Trash2, Settings2, Package, Sparkles,
} from 'lucide-react';
import { ProductAiImagePicker } from '@/components/shared/ProductAiImagePicker';

const masterProductSchema = z.object({
  name: z.string().min(1, 'Tên linh kiện là bắt buộc'),
  category: z.string().min(1, 'Danh mục là bắt buộc'),
  brand: z.string().min(1, 'Thương hiệu là bắt buộc'),
  model: z.string().min(1, 'Model là bắt buộc'),
  description: z.string().optional(),
  specs: z.object({
    cpu: z.string().optional(),
    mainboard: z.string().optional(),
    ram: z.string().optional(),
    ssd: z.string().optional(),
    hdd: z.string().optional(),
    vga: z.string().optional(),
    psu: z.string().optional(),
    case: z.string().optional(),
    cooler: z.string().optional(),
    windows: z.string().optional(),
    office: z.string().optional(),
    accessories: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
});

type MasterProductFormData = z.infer<typeof masterProductSchema>;

export function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [primaryImageUrl, setPrimaryImageUrl] = useState<string>('');
  const [images, setImages] = useState<ProductImage[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [showAllSpecs, setShowAllSpecs] = useState(false);
  const [suggestingSpecs, setSuggestingSpecs] = useState(false);

  const {
    register, handleSubmit, reset, formState: { errors }, watch, setValue,
  } = useForm<MasterProductFormData>({
    resolver: zodResolver(masterProductSchema),
    defaultValues: {
      category: ProductCategory.CPU,
      specs: {},
    },
  });

  const selectedCategory = watch('category');

  const handleAiSuggestSpecs = async () => {
    const name = watch('name');
    if (!name || !name.trim()) {
      toast.error('Vui lòng nhập Tên linh kiện trước khi yêu cầu Gemini gợi ý thông số!');
      return;
    }

    setSuggestingSpecs(true);
    try {
      const res = await api.post('/ai/suggest-specs', {
        name: name.trim(),
        category: watch('category'),
      });
      if (res.data.success && res.data.data) {
        const d = res.data.data;
        if (d.brand) setValue('brand', d.brand);
        if (d.model) setValue('model', d.model);
        if (d.description) setValue('description', d.description);
        if (d.specs) {
          Object.keys(d.specs).forEach((k) => {
            if (d.specs[k]) setValue(`specs.${k}` as any, d.specs[k]);
          });
        }
        setShowAllSpecs(true);
        toast.success('✨ AI đã tự động điền Thông số & Hãng sản xuất!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi gợi ý thông số từ AI');
    } finally {
      setSuggestingSpecs(false);
    }
  };

  useEffect(() => {
    if (isEdit) fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/products/${id}`);
      const product = res.data.data;
      reset({
        name: product.name,
        category: product.category,
        brand: product.brand,
        model: product.model,
        description: product.description,
        specs: product.specs || {},
      });
      const imgs = product.images || [];
      setImages(imgs);
      const thumb = imgs.find((img: any) => img.isThumbnail) || imgs[0];
      if (thumb?.url) setPrimaryImageUrl(thumb.url);
    } catch {
      toast.error('Không thể tải mã sản phẩm');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: MasterProductFormData) => {
    setSaving(true);
    try {
      const rawImages = isEdit
        ? images
        : primaryImageUrl
        ? [{ url: primaryImageUrl, publicId: `img_${Date.now()}`, isThumbnail: true, order: 0 }]
        : [];

      // Clean up images array: strip invalid client-side temporary _id (like img_...)
      const cleanedImages = rawImages.map((img: any) => {
        const item = { ...img };
        if (item._id && !/^[0-9a-fA-F]{24}$/.test(String(item._id))) {
          delete item._id;
        }
        return item;
      });

      const payload: any = {
        ...data,
        imageUrl: primaryImageUrl || undefined,
        images: cleanedImages,
      };

      if (isEdit) {
        await api.put(`/products/${id}`, payload);
        toast.success('Đã cập nhật Mã sản phẩm');
      } else {
        const res = await api.post('/products', payload);
        toast.success('Đã tạo Mã sản phẩm mới thành công');
        navigate(`/products/${res.data.data._id}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi lưu sản phẩm');
    } finally {
      setSaving(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!isEdit) {
      toast.error('Vui lòng lưu thông tin Mã sản phẩm trước khi upload ảnh');
      return;
    }
    setUploadingImages(true);
    try {
      const formData = new FormData();
      acceptedFiles.forEach((file) => formData.append('images', file));
      const res = await api.post(`/products/${id}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImages(res.data.data.images);
      toast.success(`Đã upload ${acceptedFiles.length} ảnh`);
    } catch {
      toast.error('Không thể upload ảnh');
    } finally {
      setUploadingImages(false);
    }
  }, [id, isEdit]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 10,
  });

  const deleteImage = async (imageId?: string, url?: string) => {
    if (!imageId) {
      setImages((prev) => prev.filter((img) => (url ? img.url !== url : false)));
      toast.success('Đã xóa ảnh');
      return;
    }
    try {
      const res = await api.delete(`/products/${id}/images/${imageId}`);
      setImages(res.data.data.images);
      toast.success('Đã xóa ảnh');
    } catch {
      toast.error('Không thể xóa ảnh');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const inputClass = cn(
    'w-full px-4 py-2.5 rounded-xl text-sm',
    'bg-[rgb(var(--muted))] border border-[rgb(var(--border))]',
    'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50',
    'transition-smooth'
  );

  const labelClass = 'text-sm font-medium text-[rgb(var(--foreground))] mb-1.5 block';
  const errorClass = 'text-xs text-red-500 mt-1';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-24 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="p-2 rounded-xl hover:bg-[rgb(var(--accent))] transition-smooth flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {isEdit ? 'Chỉnh sửa Mã sản phẩm' : 'Tạo Mã sản phẩm mới (Catalog Master)'}
            </h1>
            <p className="hidden sm:block text-sm text-[rgb(var(--muted-foreground))]">
              Định nghĩa Tên linh kiện, Ảnh đại diện, Thương hiệu, Model và Thông số kỹ thuật
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={saving}
          className="hidden md:flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-medium hover:opacity-90 transition-smooth disabled:opacity-50 shadow-lg shadow-blue-500/25 flex-shrink-0"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Đang lưu...' : 'Lưu Mã Sản Phẩm'}
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Section title="Thông tin định danh Mã sản phẩm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-[rgb(var(--foreground))]">
                  Tên linh kiện / Mã sản phẩm *
                </label>
                <button
                  type="button"
                  onClick={handleAiSuggestSpecs}
                  disabled={suggestingSpecs}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {suggestingSpecs ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  )}
                  <span>{suggestingSpecs ? 'Đang phân tích Gemini...' : '✨ AI Gợi ý Specs (Gemini)'}</span>
                </button>
              </div>
              <input {...register('name')} className={inputClass} placeholder="VD: CPU Intel Core i7-10700" />
              {errors.name && <p className={errorClass}>{errors.name.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Danh mục linh kiện *</label>
              <select {...register('category')} className={inputClass}>
                {Object.values(ProductCategory).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Thương hiệu *</label>
              <input {...register('brand')} className={inputClass} placeholder="VD: Intel, Kingston, ASUS..." />
              {errors.brand && <p className={errorClass}>{errors.brand.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Model *</label>
              <input {...register('model')} className={inputClass} placeholder="VD: i7-10700 / RTX 3060..." />
              {errors.model && <p className={errorClass}>{errors.model.message}</p>}
            </div>
          </div>
        </Section>

        {/* Ảnh đại diện & Tạo ảnh AI */}
        <Section title="Ảnh đại diện & Tạo ảnh tự động AI (OpenAI DALL-E)">
          <ProductAiImagePicker
            imageUrl={primaryImageUrl}
            onChange={(url, publicId) => {
              setPrimaryImageUrl(url);
              if (url) {
                setImages((prev) => {
                  const withoutThumb = prev.map((img) => ({ ...img, isThumbnail: false }));
                  return [
                    {
                      url,
                      publicId: publicId || `img_${Date.now()}`,
                      isThumbnail: true,
                      order: 0,
                    },
                    ...withoutThumb,
                  ];
                });
              } else {
                setImages([]);
              }
            }}
            productName={watch('name')}
            category={watch('category')}
            brand={watch('brand')}
            model={watch('model')}
          />
        </Section>

        {/* Specs */}
        <Section title={`Thông số kỹ thuật (${selectedCategory})`}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-[rgb(var(--muted-foreground))]">
              Điền các thông số kỹ thuật chuẩn cho mã linh kiện này
            </p>
            <button
              type="button"
              onClick={() => setShowAllSpecs(!showAllSpecs)}
              className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1"
            >
              <Settings2 className="w-3.5 h-3.5" />
              {showAllSpecs ? 'Thu gọn' : 'Tất cả trường thông số'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedCategory === ProductCategory.CPU && (
              <div>
                <label className={labelClass}>Thông số CPU (Xung nhịp / Luồng)</label>
                <input {...register('specs.cpu')} className={inputClass} placeholder="VD: 8 Nhân 16 Luồng, 2.9GHz - 4.8GHz" />
              </div>
            )}

            {selectedCategory === ProductCategory.RAM && (
              <div>
                <label className={labelClass}>Thông số RAM (Dung lượng / Bus / Loaị)</label>
                <input {...register('specs.ram')} className={inputClass} placeholder="VD: 16GB DDR4 3200MHz Bus" />
              </div>
            )}

            {(selectedCategory === 'HDD' || selectedCategory === ProductCategory.SSD) && (
              <div>
                <label className={labelClass}>Thông số Ổ cứng (Dung lượng / Chuẩn)</label>
                <input {...register('specs.ssd')} className={inputClass} placeholder="VD: 512GB NVMe / 1TB HDD" />
              </div>
            )}

            {selectedCategory === ProductCategory.VGA && (
              <div>
                <label className={labelClass}>Thông số VGA (VRAM / Chipset)</label>
                <input {...register('specs.vga')} className={inputClass} placeholder="VD: 12GB GDDR6 RTX 3060" />
              </div>
            )}

            {selectedCategory === ProductCategory.MAINBOARD && (
              <div>
                <label className={labelClass}>Thông số Mainboard (Socket / Chipset)</label>
                <input {...register('specs.mainboard')} className={inputClass} placeholder="VD: LGA1700 / Intel B760" />
              </div>
            )}

            {selectedCategory === ProductCategory.PSU && (
              <div>
                <label className={labelClass}>Thông số Nguồn PSU (Công suất / Chuẩn)</label>
                <input {...register('specs.psu')} className={inputClass} placeholder="VD: 650W 80 Plus Bronze" />
              </div>
            )}

            {selectedCategory === ProductCategory.CASE && (
              <div>
                <label className={labelClass}>Thông số Case (Loại / Màu)</label>
                <input {...register('specs.case')} className={inputClass} placeholder="VD: ATX Kính cường lực / Đen" />
              </div>
            )}

            {(showAllSpecs || selectedCategory === ProductCategory.PC || selectedCategory === ProductCategory.LAPTOP) && (
              <>
                {selectedCategory !== ProductCategory.CPU && (
                  <div>
                    <label className={labelClass}>CPU</label>
                    <input {...register('specs.cpu')} className={inputClass} placeholder="VD: i7 10700" />
                  </div>
                )}
                {selectedCategory !== ProductCategory.MAINBOARD && (
                  <div>
                    <label className={labelClass}>Mainboard</label>
                    <input {...register('specs.mainboard')} className={inputClass} placeholder="VD: B560M" />
                  </div>
                )}
                {selectedCategory !== ProductCategory.RAM && (
                  <div>
                    <label className={labelClass}>RAM</label>
                    <input {...register('specs.ram')} className={inputClass} placeholder="VD: 16GB" />
                  </div>
                )}
                {selectedCategory !== ProductCategory.SSD && (
                  <div>
                    <label className={labelClass}>SSD</label>
                    <input {...register('specs.ssd')} className={inputClass} placeholder="VD: 512GB" />
                  </div>
                )}
                {selectedCategory !== ProductCategory.VGA && (
                  <div>
                    <label className={labelClass}>VGA</label>
                    <input {...register('specs.vga')} className={inputClass} placeholder="VD: RTX 3060" />
                  </div>
                )}
                {selectedCategory !== ProductCategory.PSU && (
                  <div>
                    <label className={labelClass}>Nguồn PSU</label>
                    <input {...register('specs.psu')} className={inputClass} placeholder="VD: 650W" />
                  </div>
                )}
                {selectedCategory !== ProductCategory.CASE && (
                  <div>
                    <label className={labelClass}>Case</label>
                    <input {...register('specs.case')} className={inputClass} placeholder="VD: ATX" />
                  </div>
                )}
              </>
            )}

            <div className="md:col-span-2">
              <label className={labelClass}>Phụ kiện đi kèm</label>
              <input {...register('specs.accessories')} className={inputClass} placeholder="VD: Cáp Sata, ốc vít, hộp box..." />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Ghi chú kỹ thuật</label>
              <textarea {...register('specs.notes')} className={cn(inputClass, 'h-20 resize-none')} placeholder="Ghi chú kỹ thuật cho mã linh kiện này..." />
            </div>
          </div>
        </Section>

        {/* Description */}
        <Section title="Mô tả chi tiết" collapsible defaultOpen={Boolean(watch('description'))}>
          <textarea
            {...register('description')}
            className={cn(inputClass, 'h-32 resize-none')}
            placeholder="Mô tả chi tiết tổng quan về mã linh kiện này..."
          />
        </Section>

        {/* Images */}
        {isEdit && (
          <Section title="Hình ảnh đại diện sản phẩm">
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-smooth',
                isDragActive
                  ? 'border-blue-500 bg-blue-500/5'
                  : 'border-[rgb(var(--border))] hover:border-blue-500/30'
              )}
            >
              <input {...getInputProps()} />
              {uploadingImages ? (
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
              ) : (
                <>
                  <Upload className="w-8 h-8 text-[rgb(var(--muted-foreground))] mx-auto mb-2" />
                  <p className="text-sm text-[rgb(var(--muted-foreground))]">
                    {isDragActive ? 'Thả ảnh vào đây...' : 'Kéo thả hoặc click để upload ảnh đại diện linh kiện'}
                  </p>
                  <p className="text-xs text-[rgb(var(--muted-foreground))] mt-1">
                    JPEG, PNG, WebP • Max 10MB
                  </p>
                </>
              )}
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
                {images.sort((a, b) => a.order - b.order).map((img) => (
                  <div
                    key={img._id}
                    className={cn(
                      'relative group rounded-xl overflow-hidden border',
                      img.isThumbnail ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-[rgb(var(--border))]'
                    )}
                  >
                    <img
                      src={img.url}
                      alt=""
                      className="w-full aspect-square object-cover"
                      loading="lazy"
                    />
                    {img.isThumbnail && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-blue-500 text-white text-[10px] font-medium">
                        Ảnh đại diện
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteImage(img._id, img.url)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-smooth hover:bg-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}
      </form>

      {/* Mobile sticky save bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-[rgb(var(--card))] border-t border-[rgb(var(--border))] shadow-[0_-4px_12px_rgba(0,0,0,0.15)]">
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-medium hover:opacity-90 transition-smooth disabled:opacity-50 shadow-lg shadow-blue-500/25"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Đang lưu...' : 'Lưu Mã Sản Phẩm'}
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  collapsible = false,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between mb-0"
        >
          <h2 className="text-base font-semibold">{title}</h2>
          <span className="text-xs font-semibold text-blue-500">{open ? 'Thu gọn' : '+ Mở rộng'}</span>
        </button>
      ) : (
        <h2 className="text-base font-semibold mb-4">{title}</h2>
      )}
      {(!collapsible || open) && <div className={collapsible ? 'mt-4' : ''}>{children}</div>}
    </div>
  );
}
