import { Request, Response, NextFunction } from 'express';
import { AiService } from '../services/ai.service';
import { AppError } from '../services/product.service';

const aiService = new AiService();

const asyncHandler =
  (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export class AiController {
  // POST /api/ai/generate-product-images
  generateProductImages = asyncHandler(async (req: Request, res: Response) => {
    const { name, category, brand, model, customPrompt } = req.body;
    if (!name || !name.trim()) {
      throw new AppError('Vui lòng nhập Tên sản phẩm trước khi tạo ảnh AI', 400);
    }

    const result = await aiService.generateProductImages({
      name,
      category,
      brand,
      model,
      customPrompt,
    });

    res.json({ success: true, data: result });
  });

  // POST /api/ai/save-generated-image
  saveGeneratedImage = asyncHandler(async (req: Request, res: Response) => {
    const { imageUrl, productName } = req.body;
    if (!imageUrl) {
      throw new AppError('Vui lòng cung cấp imageUrl', 400);
    }

    const result = await aiService.saveGeneratedImage(imageUrl, productName);
    res.json({ success: true, data: result });
  });

  // POST /api/ai/upload-image (multipart file)
  uploadImage = asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      throw new AppError('Vui lòng chọn file hình ảnh', 400);
    }

    const result = await aiService.uploadDirectImage(file.buffer, file.originalname);
    res.json({ success: true, data: result });
  });

  // POST /api/ai/suggest-specs
  suggestProductSpecs = asyncHandler(async (req: Request, res: Response) => {
    const { name, category } = req.body;
    if (!name || !name.trim()) {
      throw new AppError('Vui lòng nhập Tên sản phẩm để gợi ý thông số', 400);
    }

    const result = await aiService.suggestProductSpecs(name, category);
    res.json({ success: true, data: result });
  });
}
