"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const models_1 = require("../models");
const middleware_1 = require("../middleware");
const JWT_SECRET = process.env.JWT_SECRET || 'np_computer_jwt_secret_key_2026';
class AuthController {
    // POST /api/auth/register
    register = (0, middleware_1.asyncHandler)(async (req, res) => {
        const { username, password, confirmPassword } = req.body;
        if (!username || typeof username !== 'string') {
            return res.status(400).json({ success: false, message: 'Tên đăng nhập không được để trống' });
        }
        const trimmedUsername = username.trim();
        if (trimmedUsername.length < 4 || trimmedUsername.length > 30) {
            return res.status(400).json({ success: false, message: 'Tên đăng nhập phải từ 4 đến 30 ký tự' });
        }
        const validUsernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!validUsernameRegex.test(trimmedUsername)) {
            return res.status(400).json({
                success: false,
                message: 'Tên đăng nhập chỉ được chứa chữ cái, chữ số và dấu gạch dưới',
            });
        }
        if (!password || typeof password !== 'string' || password.length < 8) {
            return res.status(400).json({ success: false, message: 'Mật khẩu phải có tối thiểu 8 ký tự' });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'Xác nhận mật khẩu không khớp với mật khẩu' });
        }
        const usernameNormalized = trimmedUsername.toLowerCase();
        const existing = await models_1.User.findOne({ usernameNormalized }).exec();
        if (existing) {
            return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại trên hệ thống' });
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        await models_1.User.create({
            username: trimmedUsername,
            usernameNormalized,
            passwordHash,
            role: models_1.UserRole.USER,
            status: models_1.UserStatus.PENDING,
            isActive: false,
            registeredAt: new Date(),
        });
        return res.status(201).json({
            success: true,
            message: 'Đăng ký thành công. Tài khoản của bạn đang chờ quản trị viên kích hoạt.',
        });
    });
    // POST /api/auth/login
    login = (0, middleware_1.asyncHandler)(async (req, res) => {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Tên đăng nhập hoặc mật khẩu không chính xác.',
            });
        }
        const usernameNormalized = String(username).trim().toLowerCase();
        const user = await models_1.User.findOne({ usernameNormalized }).exec();
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Tên đăng nhập hoặc mật khẩu không chính xác.',
            });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Tên đăng nhập hoặc mật khẩu không chính xác.',
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
        user.lastLoginAt = new Date();
        await user.save();
        const token = jsonwebtoken_1.default.sign({ id: user._id.toString(), username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, {
            httpOnly: true,
            secure: false, // Set to true in production SSL
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user._id.toString(),
                    username: user.username,
                    role: user.role,
                    status: user.status,
                },
            },
        });
    });
    // POST /api/auth/admin-login
    adminLogin = (0, middleware_1.asyncHandler)(async (req, res) => {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Tên đăng nhập hoặc mật khẩu không chính xác.',
            });
        }
        const usernameNormalized = String(username).trim().toLowerCase();
        const user = await models_1.User.findOne({ usernameNormalized }).exec();
        if (!user || user.role !== models_1.UserRole.ADMIN) {
            return res.status(400).json({
                success: false,
                message: 'Tên đăng nhập hoặc mật khẩu không chính xác.',
            });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Tên đăng nhập hoặc mật khẩu không chính xác.',
            });
        }
        if (!user.isActive || user.status !== models_1.UserStatus.ACTIVE) {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản Admin đã bị vô hiệu hóa.',
            });
        }
        user.lastLoginAt = new Date();
        await user.save();
        const token = jsonwebtoken_1.default.sign({ id: user._id.toString(), username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user._id.toString(),
                    username: user.username,
                    role: user.role,
                    status: user.status,
                },
            },
        });
    });
    // GET /api/auth/me
    me = (0, middleware_1.asyncHandler)(async (req, res) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
        }
        const user = await models_1.User.findById(req.user.id).select('-passwordHash').exec();
        return res.json({ success: true, data: user });
    });
    // POST /api/auth/logout
    logout = (0, middleware_1.asyncHandler)(async (_req, res) => {
        res.clearCookie('token');
        return res.json({ success: true, message: 'Đã đăng xuất thành công' });
    });
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map