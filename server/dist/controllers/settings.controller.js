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
    // POST /api/settings/logo
    uploadLogo = (0, middleware_1.asyncHandler)(async (req, res) => {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ success: false, message: 'Không có file logo' });
        }
        const settings = await (0, models_1.getSettings)();
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
    uploadQR = (0, middleware_1.asyncHandler)(async (req, res) => {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ success: false, message: 'Không có file QR' });
        }
        const settings = await (0, models_1.getSettings)();
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
exports.SettingsController = SettingsController;
//# sourceMappingURL=settings.controller.js.map