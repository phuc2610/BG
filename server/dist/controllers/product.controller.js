"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductController = void 0;
const product_service_1 = require("../services/product.service");
const middleware_1 = require("../middleware");
const productService = new product_service_1.ProductService();
class ProductController {
    // GET /api/products
    getAll = (0, middleware_1.asyncHandler)(async (req, res) => {
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit) : 20;
        const search = req.query.search;
        const category = req.query.category;
        const brand = req.query.brand;
        const ownerId = req.query.ownerId;
        const result = await productService.getAll({
            page,
            limit,
            search,
            category,
            brand,
            ownerId,
        });
        res.json({ success: true, ...result });
    });
    // GET /api/products/stats
    getStats = (0, middleware_1.asyncHandler)(async (req, res) => {
        const ownerId = req.user?.id || req.query.ownerId;
        const stats = await productService.getStats(ownerId);
        res.json({ success: true, data: stats });
    });
    // GET /api/products/brands
    getBrands = (0, middleware_1.asyncHandler)(async (req, res) => {
        const ownerId = req.query.ownerId;
        const brands = await productService.getBrands(ownerId);
        res.json({ success: true, data: brands });
    });
    // GET /api/products/:id
    getById = (0, middleware_1.asyncHandler)(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const product = await productService.getById(id);
        res.json({ success: true, data: product });
    });
    // POST /api/products
    create = (0, middleware_1.asyncHandler)(async (req, res) => {
        const ownerId = req.body.ownerId || req.query.ownerId;
        const product = await productService.create({ ...req.body, ownerId });
        res.status(201).json({ success: true, data: product });
    });
    // PUT /api/products/:id
    update = (0, middleware_1.asyncHandler)(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const product = await productService.update(id, req.body);
        res.json({ success: true, data: product });
    });
    // DELETE /api/products/:id
    delete = (0, middleware_1.asyncHandler)(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        await productService.delete(id);
        res.json({ success: true, message: 'Đã xóa sản phẩm' });
    });
    // POST /api/products/:id/clone
    clone = (0, middleware_1.asyncHandler)(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const cloned = await productService.clone(id);
        res.status(201).json({ success: true, data: cloned });
    });
    // POST /api/products/:id/images
    uploadImages = (0, middleware_1.asyncHandler)(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const files = req.files;
        const product = await productService.uploadImages(id, files);
        res.json({ success: true, data: product });
    });
    // DELETE /api/products/:id/images/:imageId
    deleteImage = (0, middleware_1.asyncHandler)(async (req, res) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const imageId = Array.isArray(req.params.imageId) ? req.params.imageId[0] : req.params.imageId;
        const product = await productService.deleteImage(id, imageId);
        res.json({ success: true, data: product });
    });
}
exports.ProductController = ProductController;
//# sourceMappingURL=product.controller.js.map