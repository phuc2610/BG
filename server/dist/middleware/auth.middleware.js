"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = exports.requireAdmin = exports.authenticateUser = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const models_1 = require("../models");
const JWT_SECRET = process.env.JWT_SECRET || 'np_computer_jwt_secret_key_2026';
const authenticateUser = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }
        else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.',
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = await models_1.User.findById(decoded.id).exec();
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Tài khoản không tồn tại trên hệ thống.',
            });
        }
        if (!user.isActive || user.status !== models_1.UserStatus.ACTIVE) {
            if (user.status === models_1.UserStatus.BLOCKED) {
                return res.status(403).json({
                    success: false,
                    message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
                });
            }
            return res.status(403).json({
                success: false,
                message: 'Tài khoản chưa được kích hoạt. Vui lòng liên hệ quản trị viên.',
            });
        }
        req.user = {
            id: user._id.toString(),
            username: user.username,
            role: user.role,
            permissions: user.permissions || [],
            maxQuoteDiscountPercent: user.maxQuoteDiscountPercent || 0,
        };
        next();
    }
    catch (err) {
        return res.status(401).json({
            success: false,
            message: 'Phiên đăng nhập hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.',
        });
    }
};
exports.authenticateUser = authenticateUser;
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== models_1.UserRole.ADMIN) {
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền truy cập vào khu vực Quản Trị Hệ Thống.',
        });
    }
    next();
};
exports.requireAdmin = requireAdmin;
const requirePermission = (permissionName) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Bạn chưa đăng nhập.',
            });
        }
        // Admin or wildcard permission has full access
        if (req.user.role === models_1.UserRole.ADMIN || req.user.permissions.includes('*')) {
            return next();
        }
        if (req.user.permissions.includes(permissionName)) {
            return next();
        }
        return res.status(403).json({
            success: false,
            message: `Bạn không có quyền [${permissionName}] để thực hiện thao tác này.`,
        });
    };
};
exports.requirePermission = requirePermission;
//# sourceMappingURL=auth.middleware.js.map