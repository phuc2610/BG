"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const models_1 = require("../models");
const middleware_1 = require("../middleware");
class AdminController {
    // GET /api/admin/users
    getUsers = (0, middleware_1.asyncHandler)(async (_req, res) => {
        const users = await models_1.User.find({ role: models_1.UserRole.USER })
            .select('-passwordHash')
            .sort({ registeredAt: -1 })
            .exec();
        const totalUsers = users.length;
        const activeUsers = users.filter((u) => u.status === models_1.UserStatus.ACTIVE).length;
        const pendingUsers = users.filter((u) => u.status === models_1.UserStatus.PENDING).length;
        const blockedUsers = users.filter((u) => u.status === models_1.UserStatus.BLOCKED).length;
        res.json({
            success: true,
            data: {
                stats: {
                    totalUsers,
                    activeUsers,
                    pendingUsers,
                    blockedUsers,
                },
                users,
            },
        });
    });
    // PATCH /api/admin/users/:id/activate
    activateUser = (0, middleware_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const user = await models_1.User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại' });
        }
        user.status = models_1.UserStatus.ACTIVE;
        user.isActive = true;
        user.activatedAt = new Date();
        await user.save();
        res.json({
            success: true,
            message: `Đã kích hoạt tài khoản ${user.username} thành công.`,
            data: user,
        });
    });
    // PATCH /api/admin/users/:id/block
    blockUser = (0, middleware_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const user = await models_1.User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại' });
        }
        user.status = models_1.UserStatus.BLOCKED;
        user.isActive = false;
        await user.save();
        res.json({
            success: true,
            message: `Đã khóa tài khoản ${user.username}.`,
            data: user,
        });
    });
    // PATCH /api/admin/users/:id/unblock
    unblockUser = (0, middleware_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const user = await models_1.User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại' });
        }
        user.status = models_1.UserStatus.ACTIVE;
        user.isActive = true;
        await user.save();
        res.json({
            success: true,
            message: `Đã mở khóa tài khoản ${user.username}.`,
            data: user,
        });
    });
    // DELETE /api/admin/users/:id
    deleteUser = (0, middleware_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const user = await models_1.User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại' });
        }
        if (user.role === models_1.UserRole.ADMIN) {
            return res.status(400).json({ success: false, message: 'Không thể xóa tài khoản Quản trị viên' });
        }
        await models_1.User.findByIdAndDelete(id);
        res.json({
            success: true,
            message: `Đã xóa tài khoản ${user.username}.`,
        });
    });
}
exports.AdminController = AdminController;
//# sourceMappingURL=admin.controller.js.map