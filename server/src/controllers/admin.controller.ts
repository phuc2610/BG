import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User, UserStatus, UserRole } from '../models';
import { asyncHandler } from '../middleware';

export class AdminController {
  // GET /api/admin/users
  getUsers = asyncHandler(async (req: Request, res: Response) => {
    const { search, status, sort, role } = req.query as any;

    const filter: any = {};

    if (role && role !== 'all') {
      filter.role = role;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { username: regex },
        { fullName: regex },
      ];
    }

    let sortObj: any = { registeredAt: -1 };
    if (sort === 'oldest') sortObj = { registeredAt: 1 };
    else if (sort === 'last_login') sortObj = { lastLoginAt: -1 };

    const users = await User.find(filter)
      .select('-passwordHash')
      .sort(sortObj)
      .exec();

    const allUsers = await User.find().exec();
    const totalUsers = allUsers.length;
    const activeUsers = allUsers.filter((u) => u.status === UserStatus.ACTIVE).length;
    const pendingUsers = allUsers.filter((u) => u.status === UserStatus.PENDING).length;
    const blockedUsers = allUsers.filter((u) => u.status === UserStatus.BLOCKED).length;

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

  // PUT /api/admin/users/:id - Chỉnh sửa thông tin tài khoản (fullName, username, role, status, password)
  updateUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { fullName, username, role, status, password } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại' });
    }

    if (username && username.trim() !== user.username) {
      const existing = await User.findOne({ usernameNormalized: username.trim().toLowerCase(), _id: { $ne: user._id } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Tên đăng nhập đã được sử dụng' });
      }
      user.username = username.trim();
      user.usernameNormalized = username.trim().toLowerCase();
    }

    if (fullName !== undefined) {
      user.fullName = fullName.trim() || 'Admin';
    }

    if (role && Object.values(UserRole).includes(role)) {
      user.role = role;
    }

    if (status && Object.values(UserStatus).includes(status)) {
      user.status = status;
      user.isActive = status === UserStatus.ACTIVE;
    }

    if (password && password.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(password.trim(), salt);
    }

    await user.save();

    res.json({
      success: true,
      message: `Đã cập nhật thông tin tài khoản ${user.username} thành công`,
      data: {
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        isActive: user.isActive,
      },
    });
  });

  // GET /api/admin/users/:id/permissions
  getUserPermissions = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await User.findById(id).select('-passwordHash').exec();
    if (!user) {
      return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại' });
    }

    res.json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        role: user.role,
        status: user.status,
        isActive: user.isActive,
        permissions: user.permissions || [],
        maxQuoteDiscountPercent: user.maxQuoteDiscountPercent || 0,
      },
    });
  });

  // PUT /api/admin/users/:id/permissions
  updateUserPermissions = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { permissions, maxQuoteDiscountPercent } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại' });
    }

    if (Array.isArray(permissions)) {
      user.permissions = permissions;
    }
    if (typeof maxQuoteDiscountPercent === 'number') {
      user.maxQuoteDiscountPercent = Math.max(0, maxQuoteDiscountPercent);
    }

    await user.save();

    res.json({
      success: true,
      message: `Đã cập nhật quyền truy cập cho tài khoản ${user.username}.`,
      data: {
        _id: user._id,
        username: user.username,
        permissions: user.permissions,
        maxQuoteDiscountPercent: user.maxQuoteDiscountPercent,
      },
    });
  });

  // PATCH /api/admin/users/:id/activate
  activateUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại' });
    }

    user.status = UserStatus.ACTIVE;
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
  blockUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại' });
    }

    user.status = UserStatus.BLOCKED;
    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: `Đã khóa tài khoản ${user.username}.`,
      data: user,
    });
  });

  // PATCH /api/admin/users/:id/unblock
  unblockUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại' });
    }

    user.status = UserStatus.ACTIVE;
    user.isActive = true;
    await user.save();

    res.json({
      success: true,
      message: `Đã mở khóa tài khoản ${user.username}.`,
      data: user,
    });
  });

  // POST /api/admin/users/:id/reset-password
  resetUserPassword = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải từ 6 ký tự trở lên' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({
      success: true,
      message: `Đã đặt lại mật khẩu cho tài khoản ${user.username} thành công.`,
    });
  });

  // DELETE /api/admin/users/:id
  deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại' });
    }

    if (user.role === UserRole.ADMIN) {
      return res.status(400).json({ success: false, message: 'Không thể xóa tài khoản Quản trị viên' });
    }

    await User.findByIdAndDelete(id);
    res.json({
      success: true,
      message: `Đã xóa tài khoản ${user.username}.`,
    });
  });
}
