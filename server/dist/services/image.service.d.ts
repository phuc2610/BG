/**
 * Sanitizes SVG XML string to remove dangerous tags, script execution, and inline event listeners.
 */
export declare function sanitizeSvgBuffer(buffer: Buffer): Buffer;
export declare class ImageService {
    private uploadsDir;
    constructor();
    /**
     * Upload image buffer to Cloudinary with automatic local disk fallback.
     * Preserves SVG vector format if input is SVG.
     */
    upload(buffer: Buffer, folder?: string, originalName?: string): Promise<{
        url: string;
        publicId: string;
    }>;
    /**
     * Upload multiple images
     */
    uploadMultiple(buffers: Buffer[], folder?: string): Promise<Array<{
        url: string;
        publicId: string;
    }>>;
    /**
     * Delete image from Cloudinary or local disk
     */
    delete(publicId: string): Promise<void>;
    /**
     * Delete multiple images
     */
    deleteMultiple(publicIds: string[]): Promise<void>;
    /**
     * Upload brand setting images (logo, qr, signature, stamp, thankYou)
     */
    uploadSettingsImage(buffer: Buffer, type: 'logo' | 'qr' | 'signature' | 'stamp' | 'thankYou', originalName?: string): Promise<{
        url: string;
        publicId: string;
    }>;
}
//# sourceMappingURL=image.service.d.ts.map