import { Request, Response } from 'express';
import { User, UserStatus, UserRole } from '../models';
import { asyncHandler } from '../middleware';

export class AdminController {
  // GET /api/admin/users
  getUsers = asyncHandler(async (_req: Request, res: Response) => {
    const users = await User.find({ role: UserRole.USER })
      .select('-passwordHash')
      .sort({ registeredAt: -1 })
      .exec();

    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.status === UserStatus.ACTIVE).length;
    const pendingUsers = users.filter((u) => u.status === UserStatus.PENDING).length;
    const blockedUsers = users.filter((u) => u.status === UserStatus.BLOCKED).length;

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
