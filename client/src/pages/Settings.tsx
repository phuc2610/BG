import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import type { Settings as SettingsType } from '@/types';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Store, Phone, Globe, Share2, MapPin, Mail, CreditCard, FileText,
  Save, Upload, Loader2, Plus, Trash2, Image as ImageIcon,
} from 'lucide-react';

const settingsSchema = z.object({
  storeName: z.string().min(1, 'Tên cửa hàng là bắt buộc'),
  hotline: z.string().optional(),
  website: z.string().optional(),
  facebook: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email('Email không hợp lệ').or(z.literal('')).optional(),
  bankInfo: z.string().optional(),
  footerText: z.string().optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [terms, setTerms] = useState<string[]>([]);
  const [newTerm, setNewTerm] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingQR, setUploadingQR] = useState(false);

  const {
    register, handleSubmit, reset, formState: { errors },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings');
      const data = res.data.data;
      setSettings(data);
      setTerms(data.terms || []);
      reset({
        storeName: data.storeName,
        hotline: data.hotline,
        website: data.website,
        facebook: data.facebook,
        address: data.address,
        email: data.email,
        bankInfo: data.bankInfo,
        footerText: data.footerText,
      });
    } catch {
      toast.error('Không thể tải cài đặt');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: SettingsFormData) => {
    setSaving(true);
    try {
      const res = await api.put('/settings', { ...data, terms });
      setSettings(res.data.data);
      toast.success('Đã lưu cài đặt');
    } catch {
      toast.error('Lỗi khi lưu cài đặt');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const res = await api.post('/settings/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSettings(res.data.data);
      toast.success('Đã cập nhật logo');
    } catch {
      toast.error('Không thể upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQR(true);
    try {
      const formData = new FormData();
      formData.append('qr', file);
      const res = await api.post('/settings/qr', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSettings(res.data.data);
      toast.success('Đã cập nhật QR thanh toán');
    } catch {
      toast.error('Không thể upload QR');
    } finally {
      setUploadingQR(false);
    }
  };

  const addTerm = () => {
    if (!newTerm.trim()) return;
    setTerms([...terms, newTerm.trim()]);
    setNewTerm('');
  };

  const removeTerm = (index: number) => {
    setTerms(terms.filter((_, i) => i !== index));
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

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cài đặt hệ thống</h1>
          <p className="text-sm text-[rgb(var(--muted-foreground))] mt-1">
            Cấu hình thông tin cửa hàng, logo, QR thanh toán và mẫu báo giá PDF
          </p>
        </div>
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-medium hover:opacity-90 transition-smooth disabled:opacity-50 shadow-lg shadow-blue-500/25"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Lưu cài đặt
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Store Info */}
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Store className="w-5 h-5 text-blue-500" />
            Thông tin cửa hàng
          </h2>

          {/* Logo & QR Uploads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b border-[rgb(var(--border))]">
            {/* Logo */}
            <div>
              <label className={labelClass}>Logo cửa hàng</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-[rgb(var(--muted))] border border-[rgb(var(--border))] overflow-hidden flex items-center justify-center">
                  {settings?.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="w-8 h-8 opacity-30" />
                  )}
                </div>
                <label className="cursor-pointer px-4 py-2 rounded-xl border border-[rgb(var(--border))] text-sm font-medium hover:bg-[rgb(var(--accent))] transition-smooth flex items-center gap-2">
                  {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Tải logo lên
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                </label>
              </div>
            </div>

            {/* QR Payment */}
            <div>
              <label className={labelClass}>Ảnh QR thanh toán</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-[rgb(var(--muted))] border border-[rgb(var(--border))] overflow-hidden flex items-center justify-center">
                  {settings?.qrPaymentUrl ? (
                    <img src={settings.qrPaymentUrl} alt="QR" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="w-8 h-8 opacity-30" />
                  )}
                </div>
                <label className="cursor-pointer px-4 py-2 rounded-xl border border-[rgb(var(--border))] text-sm font-medium hover:bg-[rgb(var(--accent))] transition-smooth flex items-center gap-2">
                  {uploadingQR ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Tải QR lên
                  <input type="file" accept="image/*" className="hidden" onChange={handleQRUpload} disabled={uploadingQR} />
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Tên cửa hàng *</label>
              <input {...register('storeName')} className={inputClass} placeholder="NP Computer" />
              {errors.storeName && <p className="text-xs text-red-500 mt-1">{errors.storeName.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Hotline</label>
              <input {...register('hotline')} className={inputClass} placeholder="0123.456.789" />
            </div>
            <div>
              <label className={labelClass}>Website</label>
              <input {...register('website')} className={inputClass} placeholder="npcomputer.vn" />
            </div>
            <div>
              <label className={labelClass}>Facebook</label>
              <input {...register('facebook')} className={inputClass} placeholder="fb.com/npcomputer" />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input {...register('email')} className={inputClass} placeholder="contact@npcomputer.vn" />
            </div>
            <div>
              <label className={labelClass}>Địa chỉ</label>
              <input {...register('address')} className={inputClass} placeholder="123 Đường ABC, Quận XYZ, TP.HCM" />
            </div>
          </div>
        </div>

        {/* Bank & Payment Info */}
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-500" />
            Thông tin chuyển khoản (PDF)
          </h2>
          <div>
            <label className={labelClass}>Nội dung chuyển khoản / Số tài khoản</label>
            <textarea
              {...register('bankInfo')}
              className={cn(inputClass, 'h-24 resize-none')}
              placeholder="Ngân hàng: MB Bank&#10;STK: 1234567890&#10;Chủ TK: NGUYEN VAN A"
            />
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            Điều khoản & Bảo hành (Hiển thị trong PDF)
          </h2>

          <div className="space-y-2 mb-4">
            {terms.map((term, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-[rgb(var(--muted))]/50 border border-[rgb(var(--border))]">
                <span className="text-xs font-bold text-blue-500 w-6 text-center">{index + 1}.</span>
                <span className="flex-1 text-sm">{term}</span>
                <button
                  type="button"
                  onClick={() => removeTerm(index)}
                  className="p-1 rounded-lg hover:bg-red-500/10 text-[rgb(var(--muted-foreground))] hover:text-red-500 transition-smooth"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTerm(); } }}
              className={inputClass}
              placeholder="Nhập điều khoản mới..."
            />
            <button
              type="button"
              onClick={addTerm}
              className="px-4 py-2.5 rounded-xl bg-blue-500/10 text-blue-500 text-sm font-medium hover:bg-blue-500/20 transition-smooth flex items-center gap-2 flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              Thêm
            </button>
          </div>
        </div>

        {/* PDF Footer */}
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
          <h2 className="text-base font-semibold mb-4">Lời cảm ơn footer (PDF)</h2>
          <input
            {...register('footerText')}
            className={inputClass}
            placeholder="Cảm ơn quý khách đã tin tưởng và lựa chọn NP Computer!"
          />
        </div>
      </form>
    </div>
  );
}
