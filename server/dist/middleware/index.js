"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.validate = exports.errorHandler = void 0;
const zod_1 = require("zod");
const product_service_1 = require("../services/product.service");
// Error handling middleware
const errorHandler = (err, _req, res, _next) => {
    console.error('❌ Error:', err.message);
    if (err instanceof product_service_1.AppError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
    }
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: err.errors.map((e) => ({
                field: e.path.join('.'),
                message: e.message,
            })),
        });
    }
    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: 'ID không hợp lệ',
        });
    }
    if (err.name === 'MongoServerError' && err.code === 11000) {
        return res.status(409).json({
            success: false,
            message: 'Dữ liệu bị trùng lặp',
        });
    }
    res.status(500).json({
        success: false,
        message: 'Lỗi server nội bộ',
    });
};
exports.errorHandler = errorHandler;
// Validation middleware factory
const validate = (schema) => {
    return (req, _res, next) => {
        try {
            schema.parse(req.body);
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.validate = validate;
// Async handler wrapper
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
__exportStar(require("./auth.middleware"), exports);
__exportStar(require("./fieldSecurity.middleware"), exports);
//# sourceMappingURL=index.js.map