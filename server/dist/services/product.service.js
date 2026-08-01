"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductService = exports.AppError = void 0;
const repositories_1 = require("../repositories");
const models_1 = require("../models");
const image_service_1 = require("./image.service");
const productRepo = new repositories_1.ProductRepository();
const imageService = new image_service_1.ImageService();
class AppError extends Error {
    statusCode;
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
    }
}
exports.AppError = AppError;
class ProductService {
    async getAll(query) {
        return productRepo.search(query);
    }
    async getById(id) {
        const product = await productRepo.findById(id);
        if (!product)
            throw new AppError('Sản phẩm không tồn tại', 404);
        return product;
    }
    async getStats(ownerId) {
        return productRepo.getStats(ownerId);
    }
    async getBrands(ownerId) {
        return productRepo.getBrands(ownerId);
    }
    async getRecent(limit = 10, ownerId) {
        const filter = {};
        if (ownerId)
            filter.ownerId = ownerId;
        const result = await productRepo.findPaginated(filter, 1, limit, 'createdAt', 'desc');
        return result.data;
    }
    async create(data) {
        const productId = await (0, models_1.generateProductId)();
        const productCode = await (0, models_1.generateProductCode)(data.category);
        const barcode = `NPC${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const product = await productRepo.create({
            ownerId: data.ownerId,
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
        });
        return product;
    }
    async update(id, data) {
        const product = await productRepo.updateById(id, data);
        if (!product)
            throw new AppError('Sản phẩm không tồn tại', 404);
        return product;
    }
    async delete(id) {
        const product = await this.getById(id);
        if (product.images.length > 0) {
            await imageService.deleteMultiple(product.images.map((img) => img.publicId));
        }
        return productRepo.deleteById(id);
    }
    async clone(id) {
        const original = await this.getById(id);
        const productId = await (0, models_1.generateProductId)();
        const productCode = await (0, models_1.generateProductCode)(original.category);
        const barcode = `NPC${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const cloned = await productRepo.create({
            productId,
            productCode,
            barcode,
            name: `${original.name} (Bản sao)`,
            category: original.category,
            brand: original.brand,
            modelName: original.modelName || original.model,
            description: original.description,
            specs: original.specs,
            images: original.images,
        });
        return cloned;
    }
    async uploadImages(id, files) {
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
        product.images.push(...newImages);
        await product.save();
        return product;
    }
    async deleteImage(productId, imageId) {
        const product = await this.getById(productId);
        const imageIndex = product.images.findIndex((img) => img._id?.toString() === imageId);
        if (imageIndex === -1)
            throw new AppError('Hình ảnh không tồn tại', 404);
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
exports.ProductService = ProductService;
//# sourceMappingURL=product.service.js.map