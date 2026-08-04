import multer from 'multer';
import { AppError } from '../services/product.service';

const storage = multer.memoryStorage();

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  if (allowedMimes.includes(file.mimetype) || file.originalname.toLowerCase().endsWith('.svg')) {
    cb(null, true);
  } else {
    cb(new AppError('Chỉ chấp nhận file ảnh (JPEG, PNG, WebP, GIF, SVG)', 400));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 10, // Max 10 files per request
  },
});
