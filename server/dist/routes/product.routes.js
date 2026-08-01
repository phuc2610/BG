"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_controller_1 = require("../controllers/product.controller");
const middleware_1 = require("../middleware");
const upload_1 = require("../middleware/upload");
const validators_1 = require("../utils/validators");
const router = (0, express_1.Router)();
const controller = new product_controller_1.ProductController();
router.get('/', controller.getAll);
router.get('/stats', controller.getStats);
router.get('/brands', controller.getBrands);
router.get('/:id', controller.getById);
router.post('/', (0, middleware_1.validate)(validators_1.createProductSchema), controller.create);
router.put('/:id', (0, middleware_1.validate)(validators_1.updateProductSchema), controller.update);
router.delete('/:id', controller.delete);
router.post('/:id/clone', controller.clone);
// Image routes
router.post('/:id/images', upload_1.upload.array('images', 10), controller.uploadImages);
router.delete('/:id/images/:imageId', controller.deleteImage);
exports.default = router;
//# sourceMappingURL=product.routes.js.map