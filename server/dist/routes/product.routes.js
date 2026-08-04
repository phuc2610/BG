"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_controller_1 = require("../controllers/product.controller");
const middleware_1 = require("../middleware");
const upload_1 = require("../middleware/upload");
const validators_1 = require("../utils/validators");
const router = (0, express_1.Router)();
const controller = new product_controller_1.ProductController();
router.use(middleware_1.applyFieldLevelSecurity);
router.get('/', (0, middleware_1.requirePermission)('product.view'), controller.getAll);
router.get('/stats', (0, middleware_1.requirePermission)('product.view'), controller.getStats);
router.get('/brands', (0, middleware_1.requirePermission)('product.view'), controller.getBrands);
router.get('/:id', (0, middleware_1.requirePermission)('product.view'), controller.getById);
router.post('/', (0, middleware_1.requirePermission)('product.create'), (0, middleware_1.validate)(validators_1.createProductSchema), controller.create);
router.put('/:id', (0, middleware_1.requirePermission)('product.edit'), (0, middleware_1.validate)(validators_1.updateProductSchema), controller.update);
router.delete('/:id', (0, middleware_1.requirePermission)('product.delete'), controller.delete);
router.post('/:id/clone', (0, middleware_1.requirePermission)('product.create'), controller.clone);
// Image routes
router.post('/:id/images', (0, middleware_1.requirePermission)('product.edit'), upload_1.upload.array('images', 10), controller.uploadImages);
router.delete('/:id/images/:imageId', (0, middleware_1.requirePermission)('product.edit'), controller.deleteImage);
exports.default = router;
//# sourceMappingURL=product.routes.js.map