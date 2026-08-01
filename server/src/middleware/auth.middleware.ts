import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserStatus, UserRole } from '../models';

const JWT_SECRET = process.env.JWT_SECRET || 'np_computer_jwt_secret_key_2026';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: UserRole;
  };
}

export const authenticateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string; role: UserRole };
    const user = await User.findById(decoded.id).exec();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản không tồn tại trên hệ thống.',
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

    req.user = {
      id: user._id.toString(),
      username: user.username,
      role: user.role,
    };

    // Auto-inject ownerId for USER requests
    if (user.role === UserRole.USER) {
      if (!req.query) req.query = {};
      (req.query as any).ownerId = user._id.toString();

      if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
        req.body.ownerId = user._id.toString();
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Phiên đăng nhập hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.',
    });
  }
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.role !== UserRole.ADMIN) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền truy cập vào khu vực Quản Trị Hệ Thống.',
    });
  }
  next();
};
