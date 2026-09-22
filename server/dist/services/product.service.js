"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductService = exports.AppError = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
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
    async getStats() {
        return productRepo.getStats();
    }
    async getBrands() {
        return productRepo.getBrands();
    }
    async getRecent(limit = 10) {
        const result = await productRepo.findPaginated({}, 1, limit, 'createdAt', 'desc');
        return result.data;
    }
    async create(data) {
        const productId = await (0, models_1.generateProductId)();
        const productCode = await (0, models_1.generateProductCode)(data.category);
        const barcode = `NPC${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        let initialImages = data.images || [];
        if (data.imageUrl && initialImages.length === 0) {
            initialImages.push({
                url: data.imageUrl,
                publicId: data.imagePublicId || `img_${Date.now()}`,
                isThumbnail: true,
                order: 0,
            });
        }
        if (Array.isArray(initialImages)) {
            initialImages = initialImages.map((img) => {
                const item = { ...img };
                if (item._id && !mongoose_1.default.Types.ObjectId.isValid(String(item._id))) {
                    delete item._id;
                }
                return item;
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
        });
        return product;
    }
    async update(id, data) {
        const updateData = { ...data };
        if (updateData.images && Array.isArray(updateData.images)) {
            updateData.images = updateData.images.map((img) => {
                const item = { ...img };
                if (item._id && !mongoose_1.default.Types.ObjectId.isValid(String(item._id))) {
                    delete item._id;
                }
                return item;
            });
        }
        if (updateData.model && !updateData.modelName) {
            updateData.modelName = updateData.model;
        }
        const product = await productRepo.updateById(id, updateData);
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
    async uploadImages(productId, files) {
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
        product.images.push(...newImages);
        await product.save();
        return product;
    }
    async deleteImage(productId, imageId) {
        const product = await this.getById(productId);
        const image = product.images.find((img) => img._id?.toString() === imageId || img.publicId === imageId);
        if (!image)
            throw new AppError('Hình ảnh không tồn tại', 404);
        await imageService.deleteMultiple([image.publicId]);
        product.images = product.images.filter((img) => img._id?.toString() !== imageId && img.publicId !== imageId);
        if (image.isThumbnail && product.images.length > 0) {
            product.images[0].isThumbnail = true;
        }
        await product.save();
        return product;
    }
    async setThumbnail(productId, imageId) {
        const product = await this.getById(productId);
        product.images.forEach((img) => {
            img.isThumbnail = img._id?.toString() === imageId || img.publicId === imageId;
        });
        await product.save();
        return product;
    }
}
exports.ProductService = ProductService;
//# sourceMappingURL=product.service.js.map