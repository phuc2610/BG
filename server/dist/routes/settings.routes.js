"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settings_controller_1 = require("../controllers/settings.controller");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
const controller = new settings_controller_1.SettingsController();
router.get('/', controller.get);
router.put('/', controller.update);
router.post('/logo', upload_1.upload.single('logo'), controller.uploadLogo);
router.post('/qr', upload_1.upload.single('qr'), controller.uploadQR);
exports.default = router;
//# sourceMappingURL=settings.routes.js.map