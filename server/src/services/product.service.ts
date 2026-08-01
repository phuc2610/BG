import { ProductRepository } from '../repositories';
import { generateProductId, generateProductCode, IProductDocument } from '../models';
import { ProductCategory, ProductFilterQuery } from '../types';
import { ImageService } from './image.service';

const productRepo = new ProductRepository();
const imageService = new ImageService();

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class ProductService {
  async getAll(query: ProductFilterQuery) {
    return productRepo.search(query);
  }

  async getById(id: string) {
    const product = await productRepo.findById(id);
    if (!product) throw new AppError('Sản phẩm không tồn tại', 404);
    return product;
  }

  async getStats(ownerId?: string) {
    return productRepo.getStats(ownerId);
  }

  async getBrands(ownerId?: string) {
    return productRepo.getBrands(ownerId);
  }

  async getRecent(limit: number = 10, ownerId?: string) {
    const filter: any = {};
    if (ownerId) filter.ownerId = ownerId;
    const result = await productRepo.findPaginated(filter, 1, limit, 'createdAt', 'desc');
    return result.data;
  }

  async create(data: {
    name: string;
    category: ProductCategory;
    brand: string;
    model: string;
    description?: string;
    specs?: any;
    createdBy?: string;
    ownerId?: string;
  }) {
    const productId = await generateProductId();
    const productCode = await generateProductCode(data.category);
    const barcode = `NPC${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const product = await productRepo.create({
      ownerId: data.ownerId as any,
      productId,
      productCode,
      barcode,
      name: data.name,
      category: data.category,
      brand: data.brand,
      modelName: data.model,
      description: data.description,
      specs: data.specs || {},
      images: [],
    } as any);

    return product;
  }

  async update(id: string, data: Partial<IProductDocument>) {
    const product = await productRepo.updateById(id, data);
    if (!product) throw new AppError('Sản phẩm không tồn tại', 404);
    return product;
  }

  async delete(id: string) {
    const product = await this.getById(id);
    if (product.images.length > 0) {
      await imageService.deleteMultiple(
        product.images.map((img) => img.publicId)
      );
    }
    return productRepo.deleteById(id);
  }

  async clone(id: string) {
    const original = await this.getById(id);
    const productId = await generateProductId();
    const productCode = await generateProductCode(original.category);
    const barcode = `NPC${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const cloned = await productRepo.create({
      productId,
      productCode,
      barcode,
      name: `${original.name} (Bản sao)`,
      category: original.category,
      brand: original.brand,
      modelName: original.modelName || (original as any).model,
      description: original.description,
      specs: original.specs,
      images: original.images,
    } as any);

    return cloned;
  }

  async uploadImages(id: string, files: Express.Multer.File[]) {
    const product = await this.getById(id);
    if (!files || files.length === 0) {
      throw new AppError('Không có file ảnh nào được tải lên', 400);
    }

    const buffers = files.map((file) => file.buffer);
    const uploadedImages = await imageService.uploadMultiple(buffers);

    const isFirstImage = product.images.length === 0;

    const newImages = uploadedImages.map((img, index) => ({
      url: img.url,
      publicId: img.publicId,
      order: product.images.length + index,
      isThumbnail: isFirstImage && index === 0,
    }));

    product.images.push(...(newImages as any));
    await product.save();
    return product;
  }

  async deleteImage(productId: string, imageId: string) {
    const product = await this.getById(productId);
    const imageIndex = product.images.findIndex(
      (img) => (img as any)._id?.toString() === imageId
    );

    if (imageIndex === -1) throw new AppError('Hình ảnh không tồn tại', 404);

    const [deletedImage] = product.images.splice(imageIndex, 1);
    await imageService.delete(deletedImage.publicId);

    if (deletedImage.isThumbnail && product.images.length > 0) {
      product.images[0].isThumbnail = true;
    }

    product.images.forEach((img, i) => { img.order = i; });
    await product.save();
    return product;
  }
}
