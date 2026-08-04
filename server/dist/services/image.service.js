"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageService = void 0;
exports.sanitizeSvgBuffer = sanitizeSvgBuffer;
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const stream_1 = require("stream");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Sanitizes SVG XML string to remove dangerous tags, script execution, and inline event listeners.
 */
function sanitizeSvgBuffer(buffer) {
    let content = buffer.toString('utf-8');
    // Remove <script> ... </script>
    content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    // Remove inline event handlers like onload, onclick, onerror, etc.
    content = content.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    // Remove javascript: URLs in href or xlink:href
    content = content.replace(/(?:href|xlink:href)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '');
    // Remove <foreignObject> ... </foreignObject>
    content = content.replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, '');
    return Buffer.from(content, 'utf-8');
}
class ImageService {
    uploadsDir = path_1.default.join(__dirname, '../../uploads');
    constructor() {
        if (!fs_1.default.existsSync(this.uploadsDir)) {
            fs_1.default.mkdirSync(this.uploadsDir, { recursive: true });
        }
    }
    /**
     * Upload image buffer to Cloudinary with automatic local disk fallback.
     * Preserves SVG vector format if input is SVG.
     */
    async upload(buffer, folder = 'np-computer/products', originalName) {
        const isSvg = (originalName && originalName.toLowerCase().endsWith('.svg')) ||
            buffer.toString('utf-8', 0, 100).includes('<svg');
        let processedBuffer = buffer;
        if (isSvg) {
            processedBuffer = sanitizeSvgBuffer(buffer);
        }
        try {
            if (cloudinary_1.default.config().cloud_name) {
                const result = await new Promise((resolve, reject) => {
                    const uploadOptions = {
                        folder,
                        resource_type: 'image',
                    };
                    if (isSvg) {
                        uploadOptions.format = 'svg';
                    }
                    else {
                        uploadOptions.format = 'webp';
                        uploadOptions.quality = 'auto:good';
                        uploadOptions.transformation = [
                            { width: 1200, height: 1200, crop: 'limit' },
                            { fetch_format: 'auto', quality: 'auto' },
                        ];
                    }
                    const uploadStream = cloudinary_1.default.uploader.upload_stream(uploadOptions, (error, result) => {
                        if (error)
                            return reject(error);
                        if (!result)
                            return reject(new Error('Upload failed'));
                        resolve({
                            url: result.secure_url,
                            publicId: result.public_id,
                        });
                    });
                    const readable = new stream_1.Readable();
                    readable.push(processedBuffer);
                    readable.push(null);
                    readable.pipe(uploadStream);
                });
                return result;
            }
        }
        catch (err) {
            console.warn('⚠️ Cloudinary upload failed, falling back to local disk storage:', err?.message || err);
        }
        // Local Disk Storage Fallback
        const ext = isSvg ? 'svg' : 'webp';
        const filename = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
        const filePath = path_1.default.join(this.uploadsDir, filename);
        await fs_1.default.promises.writeFile(filePath, processedBuffer);
        return {
            url: `/uploads/${filename}`,
            publicId: `local_${filename}`,
        };
    }
    /**
     * Upload multiple images
     */
    async uploadMultiple(buffers, folder = 'np-computer/products') {
        const uploads = buffers.map((buffer) => this.upload(buffer, folder));
        return Promise.all(uploads);
    }
    /**
     * Delete image from Cloudinary or local disk
     */
    async delete(publicId) {
        if (!publicId)
            return;
        if (publicId.startsWith('local_')) {
            const filename = publicId.replace('local_', '');
            const filePath = path_1.default.join(this.uploadsDir, filename);
            if (fs_1.default.existsSync(filePath)) {
                await fs_1.default.promises.unlink(filePath).catch(() => { });
            }
            return;
        }
        try {
            await cloudinary_1.default.uploader.destroy(publicId);
        }
        catch (err) {
            console.warn('Failed to delete from Cloudinary:', err);
        }
    }
    /**
     * Delete multiple images
     */
    async deleteMultiple(publicIds) {
        if (publicIds.length === 0)
            return;
        const deletes = publicIds.map((id) => this.delete(id));
        await Promise.all(deletes);
    }
    /**
     * Upload brand setting images (logo, qr, signature, stamp, thankYou)
     */
    async uploadSettingsImage(buffer, type, originalName) {
        const folder = `np-computer/settings/${type}`;
        return this.upload(buffer, folder, originalName);
    }
}
exports.ImageService = ImageService;
//# sourceMappingURL=image.service.js.map