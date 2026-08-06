import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { User, Lock, KeyRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import type { Settings as SettingsType, BenefitItem } from '@/types';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Store, Phone, Globe, Share2, MapPin, Mail, CreditCard, FileText,
  Save, Upload, Loader2, Plus, Trash2, Image as ImageIcon, Sparkles, FileCheck, CheckCircle2,
  ShieldCheck, RotateCcw, Shield, Headphones, Layers
} from 'lucide-react';

const settingsSchema = z.object({
  storeName: z.string().min(1, 'Tên cửa hàng là bắt buộc'),
  tagline: z.string().optional(),
  hotline: z.string().optional(),
  website: z.string().optional(),
  facebook: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email('Email không hợp lệ').or(z.literal('')).optional(),
  signerName: z.string().optional(),
  signerTitle: z.string().optional(),
  bankInfo: z.string().optional(),
  footerText: z.string().optional(),
  quoteValidityDays: z.number().min(1).max(365).optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export function Settings() {
  const { user, updateProfile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [terms, setTerms] = useState<string[]>([]);
  const [newTerm, setNewTerm] = useState('');
  const [quoteValidityDays, setQuoteValidityDays] = useState<number>(7);
  const [quoteNotes, setQuoteNotes] = useState<string[]>([]);
  const [newQuoteNote, setNewQuoteNote] = useState('');

  const [profileName, setProfileName] = useState(user?.fullName || 'Admin');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  useEffect(() => {
    if (user?.fullName) {
      setProfileName(user.fullName);
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      toast.error('Họ và tên người dùng không được để trống');
      return;
    }
    try {
      setUpdatingProfile(true);
      await updateProfile({
        fullName: profileName.trim(),
        oldPassword: oldPassword || undefined,
        newPassword: newPassword || undefined,
      });
      setOldPassword('');
      setNewPassword('');
      toast.success('Đã cập nhật thông tin người dùng!');
    } catch (err: any) {
      toast.error(err.message || 'Cập nhật thất bại');
    } finally {
      setUpdatingProfile(false);
    }
  };
  const [benefits, setBenefits] = useState<BenefitItem[]>([
    { id: 'b1', enabled: true, title: 'Sản phẩm chính hãng', description: '100% chính hãng,\nđầy đủ hóa đơn VAT.', sortOrder: 1 },
    { id: 'b2', enabled: true, title: 'Đổi trả linh hoạt', description: 'Hỗ trợ đổi trả trong\n7 ngày nếu có lỗi.', sortOrder: 2 },
    { id: 'b3', enabled: true, title: 'Bảo hành uy tín', description: 'Bảo hành theo hãng,\nhỗ trợ tận tâm.', sortOrder: 3 },
    { id: 'b4', enabled: true, title: 'Hỗ trợ nhanh chóng', description: 'Tư vấn 24/7,\ngiải đáp tận tình.', sortOrder: 4 },
  ]);

  const [uploadingState, setUploadingState] = useState<Record<string, boolean>>({});

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
      if (data.benefits && data.benefits.length > 0) {
        setBenefits(data.benefits);
      }
      reset({
        storeName: data.storeName,
        tagline: data.tagline,
        hotline: data.hotline,
        website: data.website,
        facebook: data.facebook,
        address: data.address,
        email: data.email,
        signerName: data.signerName,
        signerTitle: data.signerTitle,
        bankInfo: data.bankInfo,
        footerText: data.footerText,
      });
      setQuoteValidityDays(data.quoteValidityDays ?? 7);
      setQuoteNotes(data.quoteNotes || [
        'Báo giá trên chưa bao gồm phí vận chuyển và lắp đặt.',
        'Thời gian giao hàng dự kiến: 1 - 2 ngày kể từ khi xác nhận.',
        'Bảo hành theo chính sách của hãng.',
      ]);
    } catch {
      toast.error('Không thể tải cài đặt');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: SettingsFormData) => {
    setSaving(true);
    try {
      const res = await api.put('/settings', { ...data, terms, benefits, quoteValidityDays, quoteNotes });
      setSettings(res.data.data);
      toast.success('Đã lưu cài đặt hệ thống');
    } catch {
      toast.error('Lỗi khi lưu cài đặt');
    } finally {
      setSaving(false);
    }
  };

  const handleAssetUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    assetType: 'logo' | 'qr' | 'signature' | 'stamp' | 'thankYou',
    labelName: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingState((prev) => ({ ...prev, [assetType]: true }));
    try {
      const formData = new FormData();
      formData.append(assetType, file);
      const res = await api.post(`/settings/${assetType === 'thankYou' ? 'thank-you' : assetType}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSettings(res.data.data);
      toast.success(`Đã tải lên ${labelName} thành công`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Không thể tải lên ${labelName}`);
    } finally {
      setUploadingState((prev) => ({ ...prev, [assetType]: false }));
    }
  };

  const handleDeleteAsset = async (assetType: 'logo' | 'qr' | 'signature' | 'stamp' | 'thankYou', labelName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa ${labelName}?`)) return;

    try {
      const res = await api.delete(`/settings/asset/${assetType}`);
      setSettings(res.data.data);
      toast.success(`Đã xóa ${labelName}`);
    } catch {
      toast.error(`Không thể xóa ${labelName}`);
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

  const addQuoteNote = () => {
    if (!newQuoteNote.trim()) return;
    setQuoteNotes([...quoteNotes, newQuoteNote.trim()]);
    setNewQuoteNote('');
  };

  const removeQuoteNote = (index: number) => {
    setQuoteNotes(quoteNotes.filter((_, i) => i !== index));
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
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cài đặt thương hiệu & Hệ thống</h1>
          <p className="text-sm text-[rgb(var(--muted-foreground))] mt-1">
            Cấu hình Logo SVG, Con dấu, Chữ ký tay, QR chuyển khoản và thông tin Báo giá / Hóa đơn A4
          </p>
        </div>
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-semibold hover:opacity-90 transition-smooth disabled:opacity-50 shadow-lg shadow-blue-500/25"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Lưu Cài Đặt
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* SECTION: BRANDING ASSETS (LOGO, SIGNATURE, STAMP, THANK YOU, QR) */}
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[rgb(var(--border))]">
            <h2 className="text-base font-bold flex items-center gap-2 text-[rgb(var(--foreground))]">
              <Sparkles className="w-5 h-5 text-blue-500" />
              Thương Hiệu & Chứng Từ (Logo, Chữ Ký, Con Dấu SVG/PNG)
            </h2>
            <span className="text-xs text-[rgb(var(--muted-foreground))]">
              Hỗ trợ file: <strong className="text-blue-500">.SVG (Vector)</strong>, .PNG, .WEBP
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* 1. Logo Cửa Hàng */}
            <div className="p-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))]/30 flex flex-col justify-between space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--foreground))] block mb-1">
                  1. Logo Cửa Hàng (Header)
                </label>
                <p className="text-[11px] text-[rgb(var(--muted-foreground))] mb-3">
                  Hiển thị góc trên bên trái của Báo Giá & Hóa Đơn A4
                </p>
                <div className="w-full h-28 rounded-lg bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px] bg-slate-100 border border-[rgb(var(--border))] overflow-hidden flex items-center justify-center p-2 relative">
                  {settings?.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-xs font-semibold text-slate-400">NP COMPUTER (Chưa có Logo)</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex-1 cursor-pointer px-3 py-2 rounded-xl bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-smooth flex items-center justify-center gap-1.5 shadow-sm">
                  {uploadingState['logo'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {settings?.logoUrl ? 'Thay Logo' : 'Tải Logo SVG/PNG'}
                  <input type="file" accept=".svg,.png,.webp,.jpg,.jpeg" className="hidden" onChange={(e) => handleAssetUpload(e, 'logo', 'Logo cửa hàng')} disabled={uploadingState['logo']} />
                </label>
                {settings?.logoUrl && (
                  <button type="button" onClick={() => handleDeleteAsset('logo', 'Logo cửa hàng')} className="p-2 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-smooth">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* 2. Chữ Ký Tay */}
            <div className="p-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))]/30 flex flex-col justify-between space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--foreground))] block mb-1">
                  2. Chữ Ký Tay (Footer)
                </label>
                <p className="text-[11px] text-[rgb(var(--muted-foreground))] mb-3">
                  Hiển thị tại góc xác nhận cuối trang Báo Giá / Hóa Đơn
                </p>
                <div className="w-full h-28 rounded-lg bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px] bg-slate-100 border border-[rgb(var(--border))] overflow-hidden flex items-center justify-center p-2 relative">
                  {settings?.signatureUrl ? (
                    <img src={settings.signatureUrl} alt="Signature" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-xs font-semibold text-slate-400">Chưa tải Chữ Ký SVG/PNG</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex-1 cursor-pointer px-3 py-2 rounded-xl bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-smooth flex items-center justify-center gap-1.5 shadow-sm">
                  {uploadingState['signature'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {settings?.signatureUrl ? 'Thay Chữ Ký' : 'Tải Chữ Ký SVG/PNG'}
                  <input type="file" accept=".svg,.png,.webp,.jpg,.jpeg" className="hidden" onChange={(e) => handleAssetUpload(e, 'signature', 'Chữ ký')} disabled={uploadingState['signature']} />
                </label>
                {settings?.signatureUrl && (
                  <button type="button" onClick={() => handleDeleteAsset('signature', 'Chữ ký')} className="p-2 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-smooth">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* 3. Con Dấu Mộc Tròn */}
            <div className="p-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))]/30 flex flex-col justify-between space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--foreground))] block mb-1">
                  3. Con Dấu Mộc Tròn (Footer)
                </label>
                <p className="text-[11px] text-[rgb(var(--muted-foreground))] mb-3">
                  Hiển thị đè nhẹ lên chữ ký góc xác nhận chứng từ
                </p>
                <div className="w-full h-28 rounded-lg bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px] bg-slate-100 border border-[rgb(var(--border))] overflow-hidden flex items-center justify-center p-2 relative">
                  {settings?.stampUrl ? (
                    <img src={settings.stampUrl} alt="Stamp" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-xs font-semibold text-slate-400">Chưa tải Con Dấu SVG/PNG</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex-1 cursor-pointer px-3 py-2 rounded-xl bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-smooth flex items-center justify-center gap-1.5 shadow-sm">
                  {uploadingState['stamp'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {settings?.stampUrl ? 'Thay Con Dấu' : 'Tải Con Dấu SVG/PNG'}
                  <input type="file" accept=".svg,.png,.webp,.jpg,.jpeg" className="hidden" onChange={(e) => handleAssetUpload(e, 'stamp', 'Con dấu')} disabled={uploadingState['stamp']} />
                </label>
                {settings?.stampUrl && (
                  <button type="button" onClick={() => handleDeleteAsset('stamp', 'Con dấu')} className="p-2 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-smooth">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* 4. Graphic "Thank You" */}
            <div className="p-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))]/30 flex flex-col justify-between space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--foreground))] block mb-1">
                  4. Graphic "Thank You" (Footer)
                </label>
                <p className="text-[11px] text-[rgb(var(--muted-foreground))] mb-3">
                  Hình ảnh/chữ viết tay Cảm ơn ở góc trái chân trang A4
                </p>
                <div className="w-full h-28 rounded-lg bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px] bg-slate-100 border border-[rgb(var(--border))] overflow-hidden flex items-center justify-center p-2 relative">
                  {settings?.thankYouAssetUrl ? (
                    <img src={settings.thankYouAssetUrl} alt="Thank you" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="font-serif italic text-lg font-bold text-blue-500">Thank you! (Mặc định)</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex-1 cursor-pointer px-3 py-2 rounded-xl bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-smooth flex items-center justify-center gap-1.5 shadow-sm">
                  {uploadingState['thankYou'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {settings?.thankYouAssetUrl ? 'Thay Thank You' : 'Tải Thank You SVG/PNG'}
                  <input type="file" accept=".svg,.png,.webp,.jpg,.jpeg" className="hidden" onChange={(e) => handleAssetUpload(e, 'thankYou', 'Graphic Thank You')} disabled={uploadingState['thankYou']} />
                </label>
                {settings?.thankYouAssetUrl && (
                  <button type="button" onClick={() => handleDeleteAsset('thankYou', 'Graphic Thank You')} className="p-2 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-smooth">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* 5. Mã QR Chuyển Khoản */}
            <div className="p-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))]/30 flex flex-col justify-between space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--foreground))] block mb-1">
                  5. Tùy Chọn Ảnh QR Tĩnh (Fallback)
                </label>
                <p className="text-[11px] text-[rgb(var(--muted-foreground))] mb-3">
                  (Hệ thống đã tự động tạo VietQR động theo số tiền còn nợ)
                </p>
                <div className="w-full h-28 rounded-lg bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px] bg-slate-100 border border-[rgb(var(--border))] overflow-hidden flex items-center justify-center p-2 relative">
                  {settings?.qrPaymentUrl ? (
                    <img src={settings.qrPaymentUrl} alt="QR" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-xs font-semibold text-slate-400">VietQR Tự Động (Đã tích hợp)</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex-1 cursor-pointer px-3 py-2 rounded-xl bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-smooth flex items-center justify-center gap-1.5 shadow-sm">
                  {uploadingState['qr'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {settings?.qrPaymentUrl ? 'Thay QR' : 'Tải QR Tĩnh'}
                  <input type="file" accept=".png,.webp,.jpg,.jpeg,.svg" className="hidden" onChange={(e) => handleAssetUpload(e, 'qr', 'Ảnh QR')} disabled={uploadingState['qr']} />
                </label>
                {settings?.qrPaymentUrl && (
                  <button type="button" onClick={() => handleDeleteAsset('qr', 'Ảnh QR')} className="p-2 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-smooth">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* STORE INFO & SIGNER DETAILS */}
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Store className="w-5 h-5 text-blue-500" />
            Thông Tin Doanh Nghiệp & Người Ký Chứng Từ
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Tên Cửa Hàng / Công Ty *</label>
              <input {...register('storeName')} className={inputClass} placeholder="NP Computer" />
              {errors.storeName && <p className="text-xs text-red-500 mt-1">{errors.storeName.message}</p>}
            </div>

            <div>
              <label className={labelClass}>Khẩu Hiệu / Tagline (Dưới Tên Cửa Hàng)</label>
              <input {...register('tagline')} className={inputClass} placeholder="LINH KIỆN • PC GAMING • WORKSTATION" />
            </div>

            <div>
              <label className={labelClass}>Tên Người Ký (Đơn vị xác nhận)</label>
              <input {...register('signerName')} className={inputClass} placeholder="Lê Ngọc Phiêu" />
            </div>

            <div>
              <label className={labelClass}>Chức Danh Nhan Đề Xác Nhận</label>
              <input {...register('signerTitle')} className={inputClass} placeholder="XÁC NHẬN BÁO GIÁ / HÓA ĐƠN" />
            </div>

            <div>
              <label className={labelClass}>
                Số Ngày Báo Giá Có Hiệu Lực
                <span className="ml-1 text-[rgb(var(--muted-foreground))] font-normal text-[11px]">(xuất hiện trên PDF Báo Giá)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={quoteValidityDays}
                  onChange={(e) => setQuoteValidityDays(Number(e.target.value) || 7)}
                  className={cn(inputClass, 'w-28')}
                  placeholder="7"
                />
                <span className="text-sm text-[rgb(var(--muted-foreground))]">ngày</span>
              </div>
            </div>

            <div>
              <label className={labelClass}>Hotline Liên Hệ</label>
              <input {...register('hotline')} className={inputClass} placeholder="0123.456.789" />
            </div>

            <div>
              <label className={labelClass}>Website chính thức</label>
              <input {...register('website')} className={inputClass} placeholder="npcomputer.vn" />
            </div>

            <div>
              <label className={labelClass}>Trang Facebook / Fanpage</label>
              <input {...register('facebook')} className={inputClass} placeholder="facebook.com/npcomputer.vn" />
            </div>

            <div>
              <label className={labelClass}>Email liên hệ</label>
              <input {...register('email')} className={inputClass} placeholder="contact@npcomputer.vn" />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Địa chỉ cửa hàng / Showroom</label>
              <input {...register('address')} className={inputClass} placeholder="130" />
            </div>
          </div>
        </div>

        {/* BANK INFO FOR VIETQR */}
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-500" />
            Thông Tin Tài Khoản Ngân Hàng (Tự Động Tạo Mã VietQR)
          </h2>
          <div>
            <label className={labelClass}>Nội dung tài khoản ngân hàng</label>
            <textarea
              {...register('bankInfo')}
              className={cn(inputClass, 'h-24 resize-none font-mono text-xs')}
              placeholder="Ngân hàng: MB Bank&#10;STK: 0339842949&#10;Chủ TK: LE HONG PHUC"
            />
            <p className="text-xs text-[rgb(var(--muted-foreground))] mt-1">
              Hệ thống tự động nhận diện STK, Ngân hàng và Chủ TK để sinh mã chuyển khoản VietQR chính xác.
            </p>
          </div>
        </div>

        {/* QUOTE NOTES IN PDF */}
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            GHI CHÚ Báo Giá (Phần "GHI CHÚ" ở cuối trang PDF Báo Giá)
          </h2>
          <p className="text-xs text-[rgb(var(--muted-foreground))]">
            Các dòng bên dưới sẽ xuất hiện trong hộp <strong>GHI CHÚ</strong> của PDF Báo Giá. Dòng cuối <em>"Báo giá có hiệu lực đến hết ngày..."</em> luôn tự động thêm vào và không cần nhập ở đây.
          </p>

          <div className="space-y-2 mb-4">
            {quoteNotes.map((note, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-[rgb(var(--muted))]/50 border border-[rgb(var(--border))]">
                <span className="text-xs font-bold text-amber-500 w-6 text-center">•</span>
                <span className="flex-1 text-sm">{note}</span>
                <button
                  type="button"
                  onClick={() => removeQuoteNote(index)}
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
              value={newQuoteNote}
              onChange={(e) => setNewQuoteNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addQuoteNote(); } }}
              className={inputClass}
              placeholder="Nhập dòng ghi chú mới..."
            />
            <button
              type="button"
              onClick={addQuoteNote}
              className="px-4 py-2.5 rounded-xl bg-amber-500/10 text-amber-500 text-sm font-medium hover:bg-amber-500/20 transition-smooth flex items-center gap-2 flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              Thêm
            </button>
          </div>
        </div>

        {/* BENEFITS SECTION IN PDF */}
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-500" />
              Nội Dung Quyền Lợi Khách Hàng (Hiển thị 4 Ô Quyền Lợi ở Đáy Báo Giá / Hóa Đơn PDF)
            </h2>
          </div>
          <p className="text-xs text-[rgb(var(--muted-foreground))]">
            Cho phép tùy chỉnh tiêu đề, nội dung ghi chú nhỏ (hỗ trợ xuống dòng), bật/tắt hiển thị và thứ tự từng ô quyền lợi.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {benefits.map((item, index) => {
              const icons = [ShieldCheck, RotateCcw, Shield, Headphones];
              const IconComp = icons[index % icons.length] || ShieldCheck;

              return (
                <div key={item.id || index} className="p-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))]/30 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--border))]">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-blue-600">Ô Quyền Lợi #{index + 1}</span>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(e) => {
                          const updated = [...benefits];
                          updated[index] = { ...updated[index], enabled: e.target.checked };
                          setBenefits(updated);
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span>{item.enabled ? 'Đang bật' : 'Đã tắt'}</span>
                    </label>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Tiêu đề quyền lợi</label>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => {
                        const updated = [...benefits];
                        updated[index] = { ...updated[index], title: e.target.value };
                        setBenefits(updated);
                      }}
                      className={inputClass}
                      placeholder="VD: Sản phẩm chính hãng"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Nội dung ghi chú nhỏ <span className="text-gray-400 font-normal">(Hỗ trợ xuống dòng)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={item.description}
                      onChange={(e) => {
                        const updated = [...benefits];
                        updated[index] = { ...updated[index], description: e.target.value };
                        setBenefits(updated);
                      }}
                      className={cn(inputClass, 'resize-none text-xs')}
                      placeholder="VD: 100% chính hãng,&#10;đầy đủ hóa đơn VAT."
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <label className="text-xs text-gray-500">Thứ tự hiển thị:</label>
                    <input
                      type="number"
                      value={item.sortOrder || index + 1}
                      onChange={(e) => {
                        const updated = [...benefits];
                        updated[index] = { ...updated[index], sortOrder: parseInt(e.target.value) || 1 };
                        setBenefits(updated);
                      }}
                      className="w-16 px-2 py-1 text-xs border rounded-lg bg-background text-center font-mono"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* USER PROFILE & CREATOR NAME */}
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <User className="w-5 h-5 text-blue-500" />
            Thông Tin Tài Khoản Người Dùng (Hiển Thị "Người Lập" trên Báo Giá / Hóa Đơn)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Tên đăng nhập</label>
              <input type="text" value={user?.username || ''} disabled className={cn(inputClass, 'opacity-70 cursor-not-allowed')} />
            </div>

            <div>
              <label className={labelClass}>Họ và tên người lập *</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className={inputClass}
                placeholder="VD: Admin / Nguyễn Văn A"
              />
            </div>

            <div>
              <label className={labelClass}>Mật khẩu hiện tại <span className="text-gray-400 font-normal">(Nếu đổi mật khẩu)</span></label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className={inputClass}
                placeholder="Nhập mật khẩu hiện tại"
              />
            </div>

            <div>
              <label className={labelClass}>Mật khẩu mới <span className="text-gray-400 font-normal">(Tối thiểu 6 ký tự)</span></label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
                placeholder="Nhập mật khẩu mới"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={updatingProfile}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-2 transition-smooth shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {updatingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Lưu Thông Tin Người Dùng
            </button>
          </div>
        </div>

        {/* FOOTER TEXT */}
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 space-y-4">
          <h2 className="text-base font-semibold">Thông điệp Lời Cảm Ơn ở Chân Trang (Footer)</h2>
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
