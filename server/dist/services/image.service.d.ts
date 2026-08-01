export declare class ImageService {
    private uploadsDir;
    constructor();
    /**
     * Upload image buffer to Cloudinary with automatic local disk fallback on failure
     */
    upload(buffer: Buffer, folder?: string): Promise<{
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
     * Upload logo or QR image (settings)
     */
    uploadSettingsImage(buffer: Buffer, type: 'logo' | 'qr'): Promise<{
        url: string;
        publicId: string;
    }>;
}
//# sourceMappingURL=image.service.d.ts.map