import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function buildSpecsString(specs: Record<string, string | undefined>): string {
  const parts: string[] = [];
  if (specs?.cpu) parts.push(`CPU: ${specs.cpu}`);
  if (specs?.ram) parts.push(`RAM: ${specs.ram}`);
  if (specs?.ssd) parts.push(`SSD: ${specs.ssd}`);
  if (specs?.vga) parts.push(`VGA: ${specs.vga}`);
  if (specs?.mainboard) parts.push(`Main: ${specs.mainboard}`);
  return parts.join(' • ');
}

export const categoryIcons: Record<string, string> = {
  PC: '🖥️',
  Laptop: '💻',
  CPU: '⚡',
  RAM: '🧮',
  SSD: '💾',
  VGA: '🎮',
  Mainboard: '🔧',
  PSU: '🔌',
  Case: '📦',
  'Màn hình': '🖥️',
};

export const statusColors: Record<string, string> = {
  'Còn hàng': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  'Đang giữ': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  'Đã bán': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'Ẩn': 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
};

export const quoteStatusColors: Record<string, string> = {
  'Nháp': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  'Đã gửi': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'Đã chốt': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  'Đã hủy': 'bg-red-500/10 text-red-500 border-red-500/20',
};

export const invoiceStatusColors: Record<string, string> = {
  'Chưa thanh toán': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  'Thanh toán một phần': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'Đã thanh toán': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  'Đã hủy': 'bg-red-500/10 text-red-500 border-red-500/20',
  'Hoàn tiền': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

export const conditionColors: Record<string, string> = {
  'New': 'bg-emerald-500/10 text-emerald-500',
  'Like New': 'bg-blue-500/10 text-blue-500',
  '99%': 'bg-cyan-500/10 text-cyan-500',
  '95%': 'bg-amber-500/10 text-amber-500',
  'Cũ': 'bg-zinc-500/10 text-zinc-400',
};

export const customerTypeColors: Record<string, string> = {
  'Khách lẻ': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  'Khách quen': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'VIP': 'bg-purple-500/10 text-purple-500 border-purple-500/20 font-bold',
  'Doanh nghiệp': 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 font-semibold',
  'Đại lý': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-semibold',
};

export const debtBadgeColors: Record<string, { label: string; className: string }> = {
  PAID: { label: 'HOÀN THÀNH', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  UNPAID: { label: 'CÒN NỢ', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  PARTIALLY_PAID: { label: 'CÒN NỢ', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  DUE_SOON: { label: 'SẮP ĐẾN HẠN', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' },
  OVERDUE: { label: 'QUÁ HẠN', className: 'bg-red-500/10 text-red-500 border-red-500/30' },
  CANCELLED: { label: 'ĐÃ HỦY', className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
};

export function getInitialsAvatarUrl(name: string = 'KH'): string {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].substring(0, 2).toUpperCase();
  const bgColors = ['2563eb', '7c3aed', '059669', 'd97706', 'dc2626', '0284c7'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  const bg = bgColors[Math.abs(hash) % bgColors.length];
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${bg}&color=fff&size=128&bold=true`;
}

export function calculateWarrantyRemaining(
  startDateStr: string | Date | undefined,
  warrantyStr: string | undefined
): { endDate: Date; diffDays: number; isExpired: boolean; formattedEndDate: string } | null {
  if (!startDateStr || !warrantyStr) return null;

  const startDate = new Date(startDateStr);
  if (isNaN(startDate.getTime())) return null;

  const w = warrantyStr.trim().toLowerCase();
  let daysToAdd = 0;
  let monthsToAdd = 0;

  if (w.includes('ngày') || w.includes('day')) {
    const num = parseInt(w.match(/\d+/)?.[0] || '0', 10);
    daysToAdd = num || 0;
  } else if (w.includes('tuần') || w.includes('week')) {
    const num = parseInt(w.match(/\d+/)?.[0] || '1', 10);
    daysToAdd = num * 7;
  } else if (w.includes('tháng') || w.includes('month')) {
    const num = parseInt(w.match(/\d+/)?.[0] || '0', 10);
    monthsToAdd = num || 0;
  } else {
    const num = parseInt(w, 10);
    if (!isNaN(num) && num > 0) {
      monthsToAdd = num;
    }
  }

  if (daysToAdd === 0 && monthsToAdd === 0) return null;

  const endDate = new Date(startDate);
  if (monthsToAdd > 0) {
    endDate.setMonth(endDate.getMonth() + monthsToAdd);
  }
  if (daysToAdd > 0) {
    endDate.setDate(endDate.getDate() + daysToAdd);
  }

  const now = new Date();
  const nowPure = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endPure = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  const diffTime = endPure.getTime() - nowPure.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    endDate,
    diffDays,
    isExpired: diffDays <= 0,
    formattedEndDate: formatDate(endDate),
  };
}
