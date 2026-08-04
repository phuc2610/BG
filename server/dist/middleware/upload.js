"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const product_service_1 = require("../services/product.service");
const storage = multer_1.default.memoryStorage();
const fileFilter = (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (allowedMimes.includes(file.mimetype) || file.originalname.toLowerCase().endsWith('.svg')) {
        cb(null, true);
    }
    else {
        cb(new product_service_1.AppError('Chỉ chấp nhận file ảnh (JPEG, PNG, WebP, GIF, SVG)', 400));
    }
};
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
        files: 10, // Max 10 files per request
    },
});
//# sourceMappingURL=upload.js.map