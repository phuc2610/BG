import cloudinary from '../config/cloudinary';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';

export class ImageService {
  private uploadsDir = path.join(__dirname, '../../uploads');

  constructor() {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Upload image buffer to Cloudinary with automatic local disk fallback on failure
   */
  async upload(
    buffer: Buffer,
    folder: string = 'np-computer/products'
  ): Promise<{ url: string; publicId: string }> {
    try {
      if (cloudinary.config().cloud_name) {
        const result = await new Promise<{ url: string; publicId: string }>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder,
              resource_type: 'image',
              format: 'webp',
              quality: 'auto:good',
              transformation: [
                { width: 1200, height: 1200, crop: 'limit' },
                { fetch_format: 'auto', quality: 'auto' },
              ],
            },
            (error, result) => {
              if (error) return reject(error);
              if (!result) return reject(new Error('Upload failed'));
              resolve({
                url: result.secure_url,
                publicId: result.public_id,
              });
            }
          );

          const readable = new Readable();
          readable.push(buffer);
          readable.push(null);
          readable.pipe(uploadStream);
        });
        return result;
      }
    } catch (err: any) {
      console.warn('⚠️ Cloudinary upload failed, falling back to local disk storage:', err?.message || err);
    }

    // Local Disk Storage Fallback
    const filename = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.webp`;
    const filePath = path.join(this.uploadsDir, filename);
    await fs.promises.writeFile(filePath, buffer);

    return {
      url: `/uploads/${filename}`,
      publicId: `local_${filename}`,
    };
  }

  /**
   * Upload multiple images
   */
  async uploadMultiple(
    buffers: Buffer[],
    folder: string = 'np-computer/products'
  ): Promise<Array<{ url: string; publicId: string }>> {
    const uploads = buffers.map((buffer) => this.upload(buffer, folder));
    return Promise.all(uploads);
  }

  /**
   * Delete image from Cloudinary or local disk
   */
  async delete(publicId: string): Promise<void> {
    if (publicId.startsWith('local_')) {
      const filename = publicId.replace('local_', '');
      const filePath = path.join(this.uploadsDir, filename);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath).catch(() => {});
      }
      return;
    }

    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.warn('Failed to delete from Cloudinary:', err);
    }
  }

  /**
   * Delete multiple images
   */
  async deleteMultiple(publicIds: string[]): Promise<void> {
    if (publicIds.length === 0) return;
    const deletes = publicIds.map((id) => this.delete(id));
    await Promise.all(deletes);
  }

  /**
   * Upload logo or QR image (settings)
   */
  async uploadSettingsImage(
    buffer: Buffer,
    type: 'logo' | 'qr'
  ): Promise<{ url: string; publicId: string }> {
    const folder = type === 'logo' ? 'np-computer/settings/logo' : 'np-computer/settings/qr';
    return this.upload(buffer, folder);
  }
}
