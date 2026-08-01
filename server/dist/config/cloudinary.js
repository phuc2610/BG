"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cloudinary_1 = require("cloudinary");
const index_1 = require("./index");
cloudinary_1.v2.config({
    cloud_name: index_1.config.cloudinary.cloudName,
    api_key: index_1.config.cloudinary.apiKey,
    api_secret: index_1.config.cloudinary.apiSecret,
});
exports.default = cloudinary_1.v2;
//# sourceMappingURL=cloudinary.js.map