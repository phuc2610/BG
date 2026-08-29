import { Request, Response, NextFunction } from 'express';
import ExcelJS from 'exceljs';
import { InventoryUnitService } from '../services/inventoryUnit.service';

const unitService = new InventoryUnitService();

const asyncHandler =
  (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export class InventoryUnitController {
  // GET /api/inventory-units
  getAll = asyncHandler(async (req: Request, res: Response) => {
    const result = await unitService.getAll(req.query);
    res.json({ success: true, ...result });
  });

  // GET /api/inventory-units/grouped
  getGroupedInventory = asyncHandler(async (req: Request, res: Response) => {
    const data = await unitService.getGroupedInventory(req.query as any);
    res.json({ success: true, data });
  });

  // GET /api/inventory-units/by-condition
  getGroupedByCondition = asyncHandler(async (req: Request, res: Response) => {
    const data = await unitService.getGroupedInventoryByCondition(req.query as any);
    res.json({ success: true, data });
  });

  // GET /api/inventory-units/export-excel
  exportExcel = asyncHandler(async (req: Request, res: Response) => {
    const data = await unitService.getExportData(req.query as any);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'NP Computer';
    wb.created = new Date();

    const ws = wb.addWorksheet('Tồn Kho', {
      views: [{ state: 'frozen', ySplit: 2 }],
    });

    // ===== TITLE ROW =====
    const exportDate = new Date().toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    ws.mergeCells('A1:P1');
    const titleCell = ws.getCell('A1');
    titleCell.value = `BÁO CÁO TỒN KHO - NP COMPUTER (Xuất lúc: ${exportDate})`;
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1E40AF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FF' } };
    ws.getRow(1).height = 36;

    // ===== HEADERS =====
    const headers = [
      'STT', 'Mã SP', 'Tên Sản Phẩm', 'Danh Mục', 'Thương Hiệu',
      'Tình Trạng', 'Serial Number', 'Nhà Cung Cấp', 'Mã Phiếu Nhập',
      'Ngày Nhập', 'Giá Nhập (đ)', 'Giá Niêm Yết (đ)',
      'BH NCC (tháng)', 'BH Kết Thúc', 'Trạng Thái BH', 'Trạng Thái Kho',
    ];

    const headerRow = ws.getRow(2);
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E2761' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF4B5563' } },
        bottom: { style: 'thin', color: { argb: 'FF4B5563' } },
        left: { style: 'thin', color: { argb: 'FF4B5563' } },
        right: { style: 'thin', color: { argb: 'FF4B5563' } },
      };
    });
    headerRow.height = 28;

    // ===== DATA ROWS =====
    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    };
    const dataFont: Partial<ExcelJS.Font> = { name: 'Arial', size: 10 };

    data.forEach((item, idx) => {
      const rowNum = idx + 3;
      const row = ws.getRow(rowNum);

      const values = [
        idx + 1,
        item.productCode,
        item.productName,
        item.category,
        item.brand,
        item.condition,
        item.serialNumber,
        item.supplierName,
        item.purchaseCode,
        item.purchaseDate ? new Date(item.purchaseDate) : '',
        item.purchasePrice,
        item.listPrice,
        item.supplierWarrantyMonths,
        item.supplierWarrantyEndDate ? new Date(item.supplierWarrantyEndDate) : '',
        item.warrantyStatusLabel,
        item.statusLabel,
      ];

      values.forEach((v, i) => {
        const cell = row.getCell(i + 1);
        cell.value = v as any;
        cell.font = { ...dataFont };
        cell.border = thinBorder;

        // STT column
        if (i === 0) cell.alignment = { horizontal: 'center' };
        // Date columns
        if (i === 9 || i === 13) {
          cell.numFmt = 'DD/MM/YYYY';
          cell.alignment = { horizontal: 'center' };
        }
        // Currency columns
        if (i === 10 || i === 11) {
          cell.numFmt = '#,##0';
          cell.alignment = { horizontal: 'right' };
        }
        // Warranty months
        if (i === 12) cell.alignment = { horizontal: 'center' };
        // Status columns alignment
        if (i === 14 || i === 15) cell.alignment = { horizontal: 'center' };
      });

      // Zebra striping
      if (idx % 2 === 1) {
        for (let c = 1; c <= 16; c++) {
          row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
        }
      }
    });

    // ===== SUMMARY ROW =====
    const summaryRowNum = data.length + 3;
    const summaryRow = ws.getRow(summaryRowNum);
    ws.mergeCells(`A${summaryRowNum}:J${summaryRowNum}`);
    const summaryLabel = summaryRow.getCell(1);
    summaryLabel.value = `TỔNG CỘNG: ${data.length} thiết bị`;
    summaryLabel.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E40AF' } };
    summaryLabel.alignment = { horizontal: 'right', vertical: 'middle' };
    summaryLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
    summaryLabel.border = thinBorder;

    const purchaseSumCell = summaryRow.getCell(11);
    purchaseSumCell.value = { formula: `SUM(K3:K${summaryRowNum - 1})` };
    purchaseSumCell.numFmt = '#,##0';
    purchaseSumCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E40AF' } };
    purchaseSumCell.alignment = { horizontal: 'right' };
    purchaseSumCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
    purchaseSumCell.border = thinBorder;

    const listSumCell = summaryRow.getCell(12);
    listSumCell.value = { formula: `SUM(L3:L${summaryRowNum - 1})` };
    listSumCell.numFmt = '#,##0';
    listSumCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E40AF' } };
    listSumCell.alignment = { horizontal: 'right' };
    listSumCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
    listSumCell.border = thinBorder;

    // Fill remaining summary cells
    for (let c = 13; c <= 16; c++) {
      const cell = summaryRow.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
      cell.border = thinBorder;
    }
    summaryRow.height = 24;

    // ===== COLUMN WIDTHS =====
    const colWidths = [6, 16, 42, 16, 16, 14, 22, 22, 16, 13, 16, 16, 10, 13, 14, 16];
    colWidths.forEach((w, i) => {
      ws.getColumn(i + 1).width = w;
    });

    // ===== AUTO FILTER =====
    ws.autoFilter = { from: 'A2', to: `P${data.length + 2}` };

    // ===== WRITE TO RESPONSE =====
    const filename = `Ton_Kho_NP_Computer_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await wb.xlsx.write(res);
    res.end();
  });

  // POST or GET /api/inventory-units/by-serials
  getUnitsBySerials = asyncHandler(async (req: Request, res: Response) => {
    let serials: string[] = [];
    if (req.method === 'POST' && Array.isArray(req.body.serials)) {
      serials = req.body.serials;
    } else if (req.query.serials) {
      if (typeof req.query.serials === 'string') {
        serials = req.query.serials.split(',').map((s) => s.trim());
      } else if (Array.isArray(req.query.serials)) {
        serials = req.query.serials.map((s) => String(s).trim());
      }
    }
    const units = await unitService.getUnitsBySerials(serials);
    res.json({ success: true, data: units });
  });

  // GET /api/inventory-units/by-product/:productId
  getUnitsByProduct = asyncHandler(async (req: any, res: Response) => {
    const productId = Array.isArray(req.params.productId)
      ? req.params.productId[0]
      : req.params.productId;
    const units = await unitService.getUnitsByProduct(productId);
    res.json({ success: true, data: units });
  });

  // GET /api/inventory-units/:id
  getById = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const unit = await unitService.getById(id);
    res.json({ success: true, data: unit });
  });

  // PATCH /api/inventory-units/:id/condition
  updateCondition = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { condition } = req.body;
    const unit = await unitService.updateUnitCondition(id, condition);
    res.json({ success: true, data: unit });
  });

  // PATCH /api/inventory-units/:id/list-price
  updateListPrice = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { listPrice } = req.body;
    const unit = await unitService.updateListPrice(id, listPrice);
    res.json({ success: true, data: unit });
  });
}
