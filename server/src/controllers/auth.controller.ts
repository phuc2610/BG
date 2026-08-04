import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, UserRole, UserStatus } from '../models';
import { asyncHandler } from '../middleware';
import { AuthRequest } from '../middleware/auth.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'np_computer_jwt_secret_key_2026';

export class AuthController {
  // POST /api/auth/register
  register = asyncHandler(async (req: Request, res: Response) => {
    const { username, fullName, password, confirmPassword } = req.body;

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
    const existing = await User.findOne({ usernameNormalized }).exec();
    if (existing) {
      return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại trên hệ thống' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await User.create({
      username: trimmedUsername,
      usernameNormalized,
      fullName: (fullName && typeof fullName === 'string' && fullName.trim()) ? fullName.trim() : 'Admin',
      passwordHash,
      role: UserRole.USER,
      status: UserStatus.PENDING,
      isActive: false,
      registeredAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: 'Đăng ký thành công. Tài khoản của bạn đang chờ quản trị viên kích hoạt.',
    });
  });

  // POST /api/auth/login
  login = asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Tên đăng nhập hoặc mật khẩu không chính xác.',
      });
    }

    const usernameNormalized = String(username).trim().toLowerCase();
    const user = await User.findOne({ usernameNormalized }).exec();

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Tên đăng nhập hoặc mật khẩu không chính xác.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Tên đăng nhập hoặc mật khẩu không chính xác.',
      });
    }

    if (!user.isActive || user.status !== UserStatus.ACTIVE) {
      if (user.status === UserStatus.BLOCKED) {
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

    if (!user.fullName) {
      user.fullName = 'Admin';
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id.toString(), username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

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
          fullName: user.fullName || 'Admin',
          role: user.role,
          status: user.status,
          permissions: user.role === UserRole.ADMIN ? ['*'] : (user.permissions || []),
          maxQuoteDiscountPercent: user.maxQuoteDiscountPercent || 0,
        },
      },
    });
  });

  // POST /api/auth/admin-login
  adminLogin = asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Tên đăng nhập hoặc mật khẩu không chính xác.',
      });
    }

    const usernameNormalized = String(username).trim().toLowerCase();
    const user = await User.findOne({ usernameNormalized }).exec();

    if (!user || user.role !== UserRole.ADMIN) {
      return res.status(400).json({
        success: false,
        message: 'Tên đăng nhập hoặc mật khẩu không chính xác.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Tên đăng nhập hoặc mật khẩu không chính xác.',
      });
    }

    if (!user.isActive || user.status !== UserStatus.ACTIVE) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản Admin đã bị vô hiệu hóa.',
      });
    }

    if (!user.fullName) {
      user.fullName = 'Admin';
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id.toString(), username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

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
          fullName: user.fullName || 'Admin',
          role: user.role,
          status: user.status,
          permissions: ['*'],
          maxQuoteDiscountPercent: 100,
        },
      },
    });
  });

  // GET /api/auth/me
  me = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
    }
    const user = await User.findById(req.user.id).select('-passwordHash').exec();
    if (user && !user.fullName) {
      user.fullName = 'Admin';
      await user.save();
    }
    return res.json({ success: true, data: user });
  });

  // PUT /api/auth/profile
  updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
    }

    const { fullName, oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    if (fullName && typeof fullName === 'string' && fullName.trim()) {
      user.fullName = fullName.trim();
    }

    if (newPassword) {
      if (!oldPassword) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập mật khẩu cũ để đổi mật khẩu' });
      }
      const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Mật khẩu cũ không chính xác' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'Mật khẩu mới phải từ 6 ký tự trở lên' });
      }
      user.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    await user.save();

    return res.json({
      success: true,
      message: 'Cập nhật thông tin cá nhân thành công',
      data: {
        id: user._id.toString(),
        username: user.username,
        fullName: user.fullName || 'Admin',
        role: user.role,
        status: user.status,
        permissions: user.role === UserRole.ADMIN ? ['*'] : (user.permissions || []),
        maxQuoteDiscountPercent: user.maxQuoteDiscountPercent || 0,
      },
    });
  });

  // POST /api/auth/logout
  logout = asyncHandler(async (_req: Request, res: Response) => {
    res.clearCookie('token');
    return res.json({ success: true, message: 'Đã đăng xuất thành công' });
  });
}
