import { Request, Response } from 'express';
import { ProductService } from '../services/product.service';
import { asyncHandler } from '../middleware';

const productService = new ProductService();

export class ProductController {
  // GET /api/products
  getAll = asyncHandler(async (req: Request, res: Response) => {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const search = req.query.search as string;
    const category = req.query.category as any;
    const brand = req.query.brand as string;
    const noImage = req.query.noImage === 'true';

    const result = await productService.getAll({
      page,
      limit,
      search,
      category,
      brand,
      noImage,
    } as any);

    res.json({ success: true, ...result });
  });

  // GET /api/products/stats
  getStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await productService.getStats();
    res.json({ success: true, data: stats });
  });

  // GET /api/products/brands
  getBrands = asyncHandler(async (_req: Request, res: Response) => {
    const brands = await productService.getBrands();
    res.json({ success: true, data: brands });
  });

  // GET /api/products/:id
  getById = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const product = await productService.getById(id);
    res.json({ success: true, data: product });
  });

  // POST /api/products
  create = asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.create(req.body);
    res.status(201).json({ success: true, data: product });
  });

  // PUT /api/products/:id
  update = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const product = await productService.update(id, req.body);
    res.json({ success: true, data: product });
  });

  // DELETE /api/products/:id
  delete = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await productService.delete(id);
    res.json({ success: true, message: 'Đã xóa sản phẩm' });
  });

  // POST /api/products/:id/clone
  clone = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const cloned = await productService.clone(id);
    res.status(201).json({ success: true, data: cloned });
  });

  // POST /api/products/:id/images
  uploadImages = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const files = req.files as Express.Multer.File[];
    const product = await productService.uploadImages(id, files);
    res.json({ success: true, data: product });
  });

  // DELETE /api/products/:id/images/:imageId
  deleteImage = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const imageId = Array.isArray(req.params.imageId) ? req.params.imageId[0] : req.params.imageId;
    const product = await productService.deleteImage(id, imageId);
    res.json({ success: true, data: product });
  });
}
