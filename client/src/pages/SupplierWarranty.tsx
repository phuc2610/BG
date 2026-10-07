import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  ShieldCheck,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Building2,
  Package,
  ScanLine,
} from 'lucide-react';
import api from '@/lib/api';
import type { InventoryUnitRecord } from '@/types';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { WarrantyLookupModal } from '@/components/warranty/WarrantyLookupModal';

export function SupplierWarranty() {
  const [units, setUnits] = useState<InventoryUnitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [warrantyFilter, setWarrantyFilter] = useState<'all' | 'valid' | 'due_soon' | 'expired'>('all');
  const [isLookupModalOpen, setIsLookupModalOpen] = useState(false);
  const [modalSerial, setModalSerial] = useState<string | undefined>(undefined);
  const [modalBrand, setModalBrand] = useState<string | undefined>(undefined);

  const fetchWarranties = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory-units', {
        params: {
          search,
          warrantyFilter,
          limit: 200,
        },
      });

      if (res.data.success) {
        // Calculate remaining warranty days
        const now = new Date();
        const processed = res.data.data.map((u: InventoryUnitRecord) => {
          const endDate = new Date(u.supplierWarrantyEndDate);
          const diffTime = endDate.getTime() - now.getTime();
          const remainingDays = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;

          let status: 'NORMAL' | 'DUE_SOON' | 'EXPIRED' = 'NORMAL';
          if (remainingDays <= 0) {
            status = 'EXPIRED';
          } else if (remainingDays <= 30) {
            status = 'DUE_SOON';
          }

          return {
            ...u,
            remainingWarrantyDays: remainingDays,
            warrantyStatus: status,
          };
        });

        setUnits(processed);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể tải danh sách bảo hành NCC');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarranties();
  }, [search, warrantyFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[rgb(var(--foreground))]">
            Quản Lý Bảo Hành Nhà Cung Cấp
          </h1>
          <p className="text-sm text-[rgb(var(--muted-foreground))] mt-1">
            Theo dõi thời hạn bảo hành của từng Serial thiết bị mua từ Nhà cung cấp
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setModalSerial(undefined);
            setModalBrand(undefined);
            setIsLookupModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary))]/90 text-white text-xs font-bold transition-all shadow flex items-center gap-2 self-start sm:self-auto"
        >
          <ScanLine className="w-4 h-4" />
          Tra Cứu Bảo Hành (OCR)
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))]">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[rgb(var(--muted-foreground))]" />
          <input
            type="text"
            placeholder="Tìm theo Serial Number, Mã SP, Tên SP, Tên NCC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-sm bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'valid', label: 'Còn bảo hành (>30d)' },
            { key: 'due_soon', label: 'Sắp hết bảo hành (<=30d)' },
            { key: 'expired', label: 'Đã hết bảo hành' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setWarrantyFilter(item.key as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap ${
                warrantyFilter === item.key
                  ? 'bg-blue-500/10 text-blue-500 border-blue-500/30 font-semibold'
                  : 'bg-[rgb(var(--background))] text-[rgb(var(--muted-foreground))] border-[rgb(var(--border))]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Warranties Table */}
      <div className="rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-sm text-[rgb(var(--muted-foreground))]">
            Đang tải dữ liệu bảo hành...
          </div>
        ) : units.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ShieldCheck className="w-12 h-12 text-[rgb(var(--muted-foreground))] mx-auto stroke-1" />
            <div className="text-base font-semibold text-[rgb(var(--foreground))]">
              Không có dữ liệu bảo hành nào
            </div>
          </div>
        ) : (
          <>
          {/* Mobile Card List */}
          <div className="md:hidden divide-y divide-[rgb(var(--border))]">
            {units.map((u) => (
              <div key={u._id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-xs text-blue-500">{u.serialNumber}</p>
                    <p className="font-semibold text-xs mt-1">{u.productName}</p>
                    <p className="font-mono text-[10px] text-[rgb(var(--muted-foreground))]">{u.productCode}</p>
                  </div>
                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${
                      u.status === 'AVAILABLE'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : u.status === 'RESERVED'
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-blue-500/10 text-blue-500'
                    }`}
                  >
                    {u.status === 'AVAILABLE' ? 'Còn hàng' : u.status === 'RESERVED' ? 'Đang giữ (HĐ)' : 'Đã bán'}
                  </span>
                </div>

                <p className="text-xs text-[rgb(var(--muted-foreground))] mt-2">
                  NCC: <strong className="text-[rgb(var(--foreground))]">{u.supplierName || 'N/A'}</strong> • Nhập: {formatDate(u.purchaseDate)}
                </p>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[rgb(var(--border))]">
                  <div className="text-xs">
                    <span className="text-[rgb(var(--muted-foreground))]">BH {u.supplierWarrantyMonths} tháng, hết hạn </span>
                    <span className="font-semibold">{formatDate(u.supplierWarrantyEndDate)}</span>
                  </div>
                  {u.warrantyStatus === 'EXPIRED' ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-500/10 text-red-500 flex-shrink-0">Hết BH</span>
                  ) : (
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0', u.warrantyStatus === 'DUE_SOON' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500')}>
                      Còn {u.remainingWarrantyDays} ngày
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[rgb(var(--muted))/50] text-[rgb(var(--muted-foreground))] text-xs font-semibold uppercase border-b border-[rgb(var(--border))]">
                <tr>
                  <th className="px-5 py-3.5">Serial Number</th>
                  <th className="px-5 py-3.5">Sản Phẩm</th>
                  <th className="px-5 py-3.5">Nhà Cung Cấp</th>
                  <th className="px-5 py-3.5">Ngày Nhập</th>
                  <th className="px-5 py-3.5">Thời Hạn BH</th>
                  <th className="px-5 py-3.5">Ngày Hết Hạn</th>
                  <th className="px-5 py-3.5 text-center">Số Ngày Còn Lại</th>
                  <th className="px-5 py-3.5 text-center">Trạng Thái Unit</th>
                  <th className="px-5 py-3.5 text-right">Tra Cứu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--border))]">
                {units.map((u) => (
                  <tr key={u._id} className="hover:bg-[rgb(var(--accent))/40] transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-xs text-blue-500">
                      {u.serialNumber}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-xs text-[rgb(var(--foreground))]">
                        {u.productName}
                      </div>
                      <div className="text-[11px] font-mono text-[rgb(var(--muted-foreground))]">
                        {u.productCode}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-[rgb(var(--foreground))]">
                      {u.supplierName || 'NCC N/A'}
                    </td>
                    <td className="px-5 py-4 text-xs text-[rgb(var(--muted-foreground))]">
                      {formatDate(u.purchaseDate)}
                    </td>
                    <td className="px-5 py-4 text-xs text-[rgb(var(--foreground))]">
                      {u.supplierWarrantyMonths} tháng
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-[rgb(var(--foreground))]">
                      {formatDate(u.supplierWarrantyEndDate)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {u.warrantyStatus === 'EXPIRED' ? (
                        <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-red-500/10 text-red-500">
                          Hết BH (0 ngày)
                        </span>
                      ) : u.warrantyStatus === 'DUE_SOON' ? (
                        <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-500/10 text-amber-500">
                          Còn {u.remainingWarrantyDays} ngày
                        </span>
                      ) : (
                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-emerald-500/10 text-emerald-500">
                          Còn {u.remainingWarrantyDays} ngày
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          u.status === 'AVAILABLE'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : u.status === 'RESERVED'
                            ? 'bg-amber-500/10 text-amber-500'
                            : 'bg-blue-500/10 text-blue-500'
                        }`}
                      >
                        {u.status === 'AVAILABLE'
                          ? 'Còn hàng'
                          : u.status === 'RESERVED'
                          ? 'Đang giữ (HĐ)'
                          : 'Đã bán'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {u.serialNumber ? (
                        <button
                          type="button"
                          onClick={() => {
                            setModalSerial(u.serialNumber);
                            setModalBrand(u.productName);
                            setIsLookupModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[rgb(var(--muted))] hover:bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))] text-xs font-semibold transition-colors inline-flex items-center gap-1"
                          title="Tra cứu bảo hành online"
                        >
                          <ScanLine className="w-3.5 h-3.5" />
                          Tra cứu
                        </button>
                      ) : (
                        <span className="text-xs text-[rgb(var(--muted-foreground))]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* Warranty Lookup Modal */}
      <WarrantyLookupModal
        isOpen={isLookupModalOpen}
        onClose={() => setIsLookupModalOpen(false)}
        initialSerial={modalSerial}
        initialBrand={modalBrand}
      />
    </div>
  );
}
