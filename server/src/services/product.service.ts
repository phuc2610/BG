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

  async getStats() {
    return productRepo.getStats();
  }

  async getBrands() {
    return productRepo.getBrands();
  }

  async getRecent(limit: number = 10) {
    const result = await productRepo.findPaginated({}, 1, limit, 'createdAt', 'desc');
    return result.data;
  }

  async create(data: {
    name: string;
    category: ProductCategory;
    brand: string;
    model: string;
    description?: string;
    specs?: any;
    imageUrl?: string;
    imagePublicId?: string;
    images?: any[];
    createdBy?: string;
  }) {
    const productId = await generateProductId();
    const productCode = await generateProductCode(data.category);
    const barcode = `NPC${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const initialImages = data.images || [];
    if (data.imageUrl && initialImages.length === 0) {
      initialImages.push({
        url: data.imageUrl,
        publicId: data.imagePublicId || `img_${Date.now()}`,
        isThumbnail: true,
        order: 0,
      });
    }

    const product = await productRepo.create({
      productId,
      productCode,
      barcode,
      name: data.name,
      category: data.category,
      brand: data.brand,
      modelName: data.model,
      description: data.description,
      specs: data.specs || {},
      images: initialImages,
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
    const source = await this.getById(id);
    const newProduct = await this.create({
      name: `${source.name} (Copy)`,
      category: source.category,
      brand: source.brand,
      model: source.modelName,
      description: source.description,
      specs: source.specs,
    });
    return newProduct;
  }

  async uploadImages(productId: string, files: Express.Multer.File[]) {
    const product = await this.getById(productId);
    const buffers = files.map((f) => f.buffer);
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
    const image = product.images.find((img: any) => img._id?.toString() === imageId || img.publicId === imageId);

    if (!image) throw new AppError('Hình ảnh không tồn tại', 404);

    await imageService.deleteMultiple([image.publicId]);
    product.images = product.images.filter((img: any) => img._id?.toString() !== imageId && img.publicId !== imageId) as any;

    if (image.isThumbnail && product.images.length > 0) {
      product.images[0].isThumbnail = true;
    }

    await product.save();
    return product;
  }

  async setThumbnail(productId: string, imageId: string) {
    const product = await this.getById(productId);

    product.images.forEach((img: any) => {
      img.isThumbnail = img._id?.toString() === imageId || img.publicId === imageId;
    });

    await product.save();
    return product;
  }
}
