import { Request, Response, NextFunction } from 'express';
import { WarrantyOcrService } from '../services/warranty/warrantyOcr.service';
import { WarrantySearchService } from '../services/warranty/warrantySearch.service';
import { WarrantyProviderRegistry } from '../services/warranty/providers/registry';
import { AuthRequest } from '../middleware/auth.middleware';

const ocrService = new WarrantyOcrService();
const searchService = new WarrantySearchService();
const registry = WarrantyProviderRegistry.getInstance();

export class WarrantyController {
  /**
   * STAGE 1: OCR ONLY
   * Processes image and extracts visible label text.
   * MUST NOT search warranty.
   */
  async processOcr(req: Request, res: Response, next: NextFunction) {
    try {
      let imageBuffer: Buffer | undefined;
      let mimeType = 'image/jpeg';

      if (req.file) {
        imageBuffer = req.file.buffer;
        mimeType = req.file.mimetype || 'image/jpeg';
      } else if (req.body.imageBase64) {
        const raw = req.body.imageBase64;
        const matches = raw.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          imageBuffer = Buffer.from(matches[2], 'base64');
        } else {
          imageBuffer = Buffer.from(raw, 'base64');
        }
      }

      if (!imageBuffer) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng tải lên file hình ảnh tem / nhãn hộp sản phẩm',
        });
      }

      const ocrResult = await ocrService.processImageOcr(imageBuffer, mimeType);

      return res.json({
        success: true,
        data: ocrResult,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * STAGE 3: CONFIRM OCR DATA
   * Validates / saves confirmed OCR data.
   * MUST NOT start warranty search.
   */
  async confirmOcr(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = req.params.sessionId as string;
      const { confirmedFields } = req.body;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu mã sessionId của phiên OCR',
        });
      }

      const result = await ocrService.confirmOcrData(sessionId, confirmedFields || {});

      return res.json({
        success: true,
        message: 'Đã xác nhận dữ liệu OCR thành công. Sẵn sàng cấu hình tìm kiếm.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * SEARCH PREVIEW
   * Returns list of providers that will be queried without executing search.
   */
  async previewSearch(req: Request, res: Response, next: NextFunction) {
    try {
      const preview = searchService.previewProviders(req.body);
      return res.json({
        success: true,
        data: preview,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * ABSOLUTE SEARCH TRIGGER
   * Executes the actual warranty search across providers.
   * Triggered ONLY when user explicitly clicks "TÌM BẢO HÀNH".
   */
  async searchWarranty(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const {
        sessionId,
        searchMode,
        serialNumber,
        brand,
        model,
        partNumber,
        distributor,
        productType,
        selectedProviderIds,
      } = req.body;

      if (!serialNumber || !serialNumber.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Số Serial Number là bắt buộc để tra cứu bảo hành',
        });
      }

      const result = await searchService.executeSearch({
        sessionId,
        searchMode: searchMode || 'AUTO',
        serialNumber,
        brand,
        model,
        partNumber,
        distributor,
        productType,
        selectedProviderIds,
        createdBy: req.user?.fullName || req.user?.username || 'Admin',
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET ALL REGISTERED PROVIDERS
   */
  async getProviders(_req: Request, res: Response) {
    const list = registry.getAvailableProvidersList();
    return res.json({
      success: true,
      data: list,
    });
  }

  /**
   * GET SEARCH HISTORY
   */
  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const history = await searchService.getHistory(req.query);
      return res.json({
        success: true,
        data: history.data,
        pagination: history.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET SEARCH HISTORY BY ID
   */
  async getHistoryById(req: Request, res: Response, next: NextFunction) {
    try {
      const record = await searchService.getHistoryById(req.params.id as string);
      return res.json({
        success: true,
        data: record,
      });
    } catch (err) {
      next(err);
    }
  }
}
