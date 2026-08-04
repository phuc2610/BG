"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsController = void 0;
const models_1 = require("../models");
const image_service_1 = require("../services/image.service");
const middleware_1 = require("../middleware");
const imageService = new image_service_1.ImageService();
class SettingsController {
    // GET /api/settings
    get = (0, middleware_1.asyncHandler)(async (_req, res) => {
        const settings = await (0, models_1.getSettings)();
        res.json({ success: true, data: settings });
    });
    // PUT /api/settings
    update = (0, middleware_1.asyncHandler)(async (req, res) => {
        let settings = await (0, models_1.getSettings)();
        Object.assign(settings, req.body);
        await settings.save();
        res.json({ success: true, data: settings });
    });
    // Helper method for single asset upload
    uploadAsset = async (req, res, assetType, urlKey, publicIdKey) => {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ success: false, message: `Không tìm thấy file ${assetType}` });
        }
        const settings = await (0, models_1.getSettings)();
        // Delete old asset if exists
        const oldPublicId = settings[publicIdKey];
        if (oldPublicId) {
            await imageService.delete(oldPublicId);
        }
        const result = await imageService.uploadSettingsImage(file.buffer, assetType, file.originalname);
        settings[urlKey] = result.url;
        settings[publicIdKey] = result.publicId;
        await settings.save();
        res.json({ success: true, data: settings });
    };
    uploadLogo = (0, middleware_1.asyncHandler)(async (req, res) => {
        await this.uploadAsset(req, res, 'logo', 'logoUrl', 'logoPublicId');
    });
    uploadQR = (0, middleware_1.asyncHandler)(async (req, res) => {
        await this.uploadAsset(req, res, 'qr', 'qrPaymentUrl', 'qrPaymentPublicId');
    });
    uploadSignature = (0, middleware_1.asyncHandler)(async (req, res) => {
        await this.uploadAsset(req, res, 'signature', 'signatureUrl', 'signaturePublicId');
    });
    uploadStamp = (0, middleware_1.asyncHandler)(async (req, res) => {
        await this.uploadAsset(req, res, 'stamp', 'stampUrl', 'stampPublicId');
    });
    uploadThankYou = (0, middleware_1.asyncHandler)(async (req, res) => {
        await this.uploadAsset(req, res, 'thankYou', 'thankYouAssetUrl', 'thankYouAssetPublicId');
    });
    // DELETE /api/settings/asset/:assetType
    deleteAsset = (0, middleware_1.asyncHandler)(async (req, res) => {
        const assetType = req.params.assetType;
        const settings = await (0, models_1.getSettings)();
        let publicIdKey = '';
        let urlKey = '';
        switch (assetType) {
            case 'logo':
                publicIdKey = 'logoPublicId';
                urlKey = 'logoUrl';
                break;
            case 'qr':
                publicIdKey = 'qrPaymentPublicId';
                urlKey = 'qrPaymentUrl';
                break;
            case 'signature':
                publicIdKey = 'signaturePublicId';
                urlKey = 'signatureUrl';
                break;
            case 'stamp':
                publicIdKey = 'stampPublicId';
                urlKey = 'stampUrl';
                break;
            case 'thankYou':
                publicIdKey = 'thankYouAssetPublicId';
                urlKey = 'thankYouAssetUrl';
                break;
            default:
                return res.status(400).json({ success: false, message: 'Loại asset không hợp lệ' });
        }
        const publicId = settings[publicIdKey];
        if (publicId) {
            await imageService.delete(publicId);
            settings[publicIdKey] = '';
            settings[urlKey] = '';
            await settings.save();
        }
        res.json({ success: true, data: settings });
    });
}
exports.SettingsController = SettingsController;
//# sourceMappingURL=settings.controller.js.map