import { Request, Response } from 'express';
import { getSettings, Settings } from '../models';
import { ImageService } from '../services/image.service';
import { asyncHandler } from '../middleware';
import { ISettings } from '../types';

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

  // Helper method for single asset upload
  private uploadAsset = async (
    req: Request,
    res: Response,
    assetType: 'logo' | 'qr' | 'signature' | 'stamp' | 'thankYou',
    urlKey: keyof ISettings,
    publicIdKey: keyof ISettings
  ) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: `Không tìm thấy file ${assetType}` });
    }

    const settings = await getSettings();

    // Delete old asset if exists
    const oldPublicId = (settings as any)[publicIdKey];
    if (oldPublicId) {
      await imageService.delete(oldPublicId);
    }

    const result = await imageService.uploadSettingsImage(file.buffer, assetType, file.originalname);
    (settings as any)[urlKey] = result.url;
    (settings as any)[publicIdKey] = result.publicId;
    await settings.save();

    res.json({ success: true, data: settings });
  };

  uploadLogo = asyncHandler(async (req: Request, res: Response) => {
    await this.uploadAsset(req, res, 'logo', 'logoUrl', 'logoPublicId');
  });

  uploadQR = asyncHandler(async (req: Request, res: Response) => {
    await this.uploadAsset(req, res, 'qr', 'qrPaymentUrl', 'qrPaymentPublicId');
  });

  uploadSignature = asyncHandler(async (req: Request, res: Response) => {
    await this.uploadAsset(req, res, 'signature', 'signatureUrl', 'signaturePublicId');
  });

  uploadStamp = asyncHandler(async (req: Request, res: Response) => {
    await this.uploadAsset(req, res, 'stamp', 'stampUrl', 'stampPublicId');
  });

  uploadThankYou = asyncHandler(async (req: Request, res: Response) => {
    await this.uploadAsset(req, res, 'thankYou', 'thankYouAssetUrl', 'thankYouAssetPublicId');
  });

  // DELETE /api/settings/asset/:assetType
  deleteAsset = asyncHandler(async (req: Request, res: Response) => {
    const assetType = req.params.assetType as 'logo' | 'qr' | 'signature' | 'stamp' | 'thankYou';
    const settings = await getSettings();

    let publicIdKey = '';
    let urlKey = '';

    switch (assetType) {
      case 'logo':
        publicIdKey = 'logoPublicId'; urlKey = 'logoUrl'; break;
      case 'qr':
        publicIdKey = 'qrPaymentPublicId'; urlKey = 'qrPaymentUrl'; break;
      case 'signature':
        publicIdKey = 'signaturePublicId'; urlKey = 'signatureUrl'; break;
      case 'stamp':
        publicIdKey = 'stampPublicId'; urlKey = 'stampUrl'; break;
      case 'thankYou':
        publicIdKey = 'thankYouAssetPublicId'; urlKey = 'thankYouAssetUrl'; break;
      default:
        return res.status(400).json({ success: false, message: 'Loại asset không hợp lệ' });
    }

    const publicId = (settings as any)[publicIdKey];
    if (publicId) {
      await imageService.delete(publicId);
      (settings as any)[publicIdKey] = '';
      (settings as any)[urlKey] = '';
      await settings.save();
    }

    res.json({ success: true, data: settings });
  });
}
