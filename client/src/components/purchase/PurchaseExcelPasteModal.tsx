import React, { useState, useMemo } from 'react';
import { X, FileSpreadsheet, CheckCircle2, AlertCircle, Plus, ArrowRight } from 'lucide-react';
import { ProductCondition } from '@/types';
import { formatCurrency, removeVietnameseTones } from '@/lib/utils';
import type { PurchaseItemData } from './PurchaseItemRow';

interface PurchaseExcelPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
  onImport: (newItems: PurchaseItemData[]) => void;
}

export function PurchaseExcelPasteModal({
  isOpen,
  onClose,
  products,
  onImport,
}: PurchaseExcelPasteModalProps) {
  const [rawText, setRawText] = useState('');

  // Helper to normalize strings for matching
  const getPid = (p: any) =>
    typeof p?._id === 'string'
      ? p._id
      : p?._id?.toString() || p?.id || String(p?._id || '');

  // Parse raw tab-separated text
  const parsedRows = useMemo(() => {
    if (!rawText.trim()) return [];

    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

    return lines.map((line, index) => {
      // Split by tab or comma or multiple spaces if no tabs
      const delimiter = line.includes('\t') ? '\t' : line.includes(',') ? ',' : /\s{2,}/;
      const parts = typeof delimiter === 'string' ? line.split(delimiter) : line.split(delimiter);

      const codeOrName = (parts[0] || '').trim();
      const qtyStr = (parts[1] || '1').replace(/[^\d]/g, '');
      const costStr = (parts[2] || '0').replace(/[^\d]/g, '');
      const listStr = (parts[3] || '0').replace(/[^\d]/g, '');
      const warrantyStr = (parts[4] || '12').replace(/[^\d]/g, '');

      const quantity = Math.max(1, Number(qtyStr) || 1);
      const costPrice = Number(costStr) || 0;
      const listPrice = Number(listStr) || costPrice;
      const warrantyMonths = Number(warrantyStr) || 12;

      // Find matching product in catalog
      const term = codeOrName.toLowerCase().trim();
      const normTerm = removeVietnameseTones(term);
      const matched = products.find((p) => {
        const pCode = (p.productCode || '').toLowerCase();
        const pName = (p.name || '').toLowerCase();
        const normName = removeVietnameseTones(pName);
        const pModel = (p.modelName || p.model || '').toLowerCase();
        const normModel = removeVietnameseTones(pModel);
        const pBarcode = (p.barcode || '').toLowerCase();

        return (
          pCode === term ||
          pName === term ||
          normName === normTerm ||
          pModel === term ||
          normModel === normTerm ||
          pBarcode === term ||
          pCode.includes(term) ||
          pName.includes(term) ||
          normName.includes(normTerm) ||
          (pModel && (pModel.includes(term) || normModel.includes(normTerm)))
        );
      });

      return {
        key: index,
        rawInput: codeOrName,
        matchedProduct: matched,
        productId: matched ? getPid(matched) : '',
        productName: matched ? matched.name : codeOrName,
        productCode: matched ? matched.productCode : '',
        quantity,
        costPrice,
        listPrice: listPrice > 0 ? listPrice : (matched?.sellingPrice || costPrice),
        condition: ProductCondition.LIKE_NEW,
        supplierWarrantyValue: warrantyMonths,
        supplierWarrantyUnit: 'month' as const,
        serialsRaw: '',
      };
    });
  }, [rawText, products]);

  const handleConfirmImport = () => {
    if (parsedRows.length === 0) return;

    const itemsToImport: PurchaseItemData[] = parsedRows.map((r) => ({
      productId: r.productId,
      productName: r.productName,
      productCode: r.productCode,
      quantity: r.quantity,
      costPrice: r.costPrice,
      listPrice: r.listPrice,
      condition: r.condition,
      supplierWarrantyValue: r.supplierWarrantyValue,
      supplierWarrantyUnit: r.supplierWarrantyUnit,
      serialsRaw: r.serialsRaw,
    }));

    onImport(itemsToImport);
    setRawText('');
    onClose();
  };

  if (!isOpen) return null;

  const matchedCount = parsedRows.filter((r) => !!r.matchedProduct).length;
  const unmatchedCount = parsedRows.length - matchedCount;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl animate-fade-in flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgb(var(--border))] bg-[rgb(var(--muted))/30] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[rgb(var(--foreground))]">
                Dán Dữ Liệu Hàng Loạt Từ Excel / Google Sheets
              </h3>
              <p className="text-xs text-[rgb(var(--muted-foreground))]">
                Copy các cột từ bảng tính và paste vào khung bên dưới để tự động nhận diện
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--accent))]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Format Hint Guide */}
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <span>📋 Cấu trúc các cột chuẩn (Ngăn cách bởi phím Tab khi copy từ Excel):</span>
            </div>
            <div className="font-mono text-[11px] bg-[rgb(var(--background))/60] p-2 rounded-lg text-[rgb(var(--foreground))] overflow-x-auto">
              [Mã SP hoặc Tên SP] &nbsp; ⇥ &nbsp; [Số Lượng] &nbsp; ⇥ &nbsp; [Giá Nhập] &nbsp; ⇥ &nbsp; [Giá Bán] &nbsp; ⇥ &nbsp; [Bảo Hành (Tháng)]
            </div>
          </div>

          {/* Textarea Input */}
          <div className="space-y-1.5">
            <label className="font-bold text-[rgb(var(--foreground))] block">
              Dán nội dung từ clipboard (Ctrl + V):
            </label>
            <textarea
              rows={5}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`Ví dụ:\nCPU-I5-12400F\t5\t3200000\t3600000\t36\nRAM-DDR4-16G\t10\t750000\t900000\t12\nVGA-RTX3060\t2\t5800000\t6500000\t24`}
              className="w-full p-3 rounded-xl font-mono text-xs bg-[rgb(var(--background))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              autoFocus
            />
          </div>

          {/* Parsed Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[rgb(var(--border))]">
              <div className="flex items-center justify-between">
                <div className="font-bold text-[rgb(var(--foreground))] flex items-center gap-2">
                  <span>Kết quả phân tích ({parsedRows.length} dòng):</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-normal">
                    ✓ Khớp danh mục: {matchedCount}
                  </span>
                  {unmatchedCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-normal">
                      ⚠ Cần chọn mã: {unmatchedCount}
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-[rgb(var(--border))] rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[rgb(var(--muted))/40] text-[rgb(var(--muted-foreground))] sticky top-0 font-semibold border-b border-[rgb(var(--border))]">
                    <tr>
                      <th className="p-2 w-10 text-center">#</th>
                      <th className="p-2">Sản Phẩm Nhận Diện</th>
                      <th className="p-2 text-center w-16">SL</th>
                      <th className="p-2 text-right w-28">Giá Nhập</th>
                      <th className="p-2 text-right w-28">Giá Bán</th>
                      <th className="p-2 text-center w-20">BH</th>
                      <th className="p-2 text-center w-28">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgb(var(--border))/40]">
                    {parsedRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-[rgb(var(--muted))/20]">
                        <td className="p-2 text-center font-mono text-[rgb(var(--muted-foreground))]">
                          {idx + 1}
                        </td>
                        <td className="p-2">
                          <div className="font-medium text-[rgb(var(--foreground))]">
                            {r.productName}
                          </div>
                          {r.matchedProduct && (
                            <div className="text-[10px] text-[rgb(var(--muted-foreground))] font-mono">
                              Mã: {r.matchedProduct.productCode}
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-center font-mono font-bold">
                          {r.quantity}
                        </td>
                        <td className="p-2 text-right font-mono">
                          {formatCurrency(r.costPrice)}
                        </td>
                        <td className="p-2 text-right font-mono text-emerald-400">
                          {formatCurrency(r.listPrice)}
                        </td>
                        <td className="p-2 text-center font-mono">
                          {r.supplierWarrantyValue} thg
                        </td>
                        <td className="p-2 text-center">
                          {r.matchedProduct ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" /> Đã khớp
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <AlertCircle className="w-3 h-3" /> Mã mới
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[rgb(var(--border))] bg-[rgb(var(--muted))/20] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--accent))]"
          >
            Hủy Bỏ
          </button>
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={parsedRows.length === 0}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm {parsedRows.length} Dòng Vào Phiếu Nhập</span>
          </button>
        </div>
      </div>
    </div>
  );
}
