import { Request, Response } from 'express';
import { getSettings, Settings } from '../models';
import { ImageService } from '../services/image.service';
import { asyncHandler } from '../middleware';

const imageService = new ImageService();

export class SettingsController {
  // GET /api/settings
  get = asyncHandler(async (_req: Request, res: Response) => {
    const settings = await getSettings();
    res.json({ success: true, data: settings });
  });

  // PUT /api/settings
  update = asyncHandler(async (req: Request, res: Response) => {
    let settings = await getSettings();
    Object.assign(settings, req.body);
    await settings.save();
    res.json({ success: true, data: settings });
  });

  // POST /api/settings/logo
  uploadLogo = asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'Không có file logo' });
    }

    const settings = await getSettings();

    // Delete old logo
    if (settings.logoPublicId) {
      await imageService.delete(settings.logoPublicId);
    }

    const result = await imageService.uploadSettingsImage(file.buffer, 'logo');
    settings.logoUrl = result.url;
    settings.logoPublicId = result.publicId;
    await settings.save();

    res.json({ success: true, data: settings });
  });

  // POST /api/settings/qr
  uploadQR = asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'Không có file QR' });
    }

    const settings = await getSettings();

    // Delete old QR
    if (settings.qrPaymentPublicId) {
      await imageService.delete(settings.qrPaymentPublicId);
    }

    const result = await imageService.uploadSettingsImage(file.buffer, 'qr');
    settings.qrPaymentUrl = result.url;
    settings.qrPaymentPublicId = result.publicId;
    await settings.save();

    res.json({ success: true, data: settings });
  });
}
