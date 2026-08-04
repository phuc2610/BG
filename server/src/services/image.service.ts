import cloudinary from '../config/cloudinary';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';

/**
 * Sanitizes SVG XML string to remove dangerous tags, script execution, and inline event listeners.
 */
export function sanitizeSvgBuffer(buffer: Buffer): Buffer {
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

export class ImageService {
  private uploadsDir = path.join(__dirname, '../../uploads');

  constructor() {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Upload image buffer to Cloudinary with automatic local disk fallback.
   * Preserves SVG vector format if input is SVG.
   */
  async upload(
    buffer: Buffer,
    folder: string = 'np-computer/products',
    originalName?: string
  ): Promise<{ url: string; publicId: string }> {
    const isSvg = (originalName && originalName.toLowerCase().endsWith('.svg')) ||
                  buffer.toString('utf-8', 0, 100).includes('<svg');

    let processedBuffer = buffer;
    if (isSvg) {
      processedBuffer = sanitizeSvgBuffer(buffer);
    }

    try {
      if (cloudinary.config().cloud_name) {
        const result = await new Promise<{ url: string; publicId: string }>((resolve, reject) => {
          const uploadOptions: any = {
            folder,
            resource_type: 'image',
          };

          if (isSvg) {
            uploadOptions.format = 'svg';
          } else {
            uploadOptions.format = 'webp';
            uploadOptions.quality = 'auto:good';
            uploadOptions.transformation = [
              { width: 1200, height: 1200, crop: 'limit' },
              { fetch_format: 'auto', quality: 'auto' },
            ];
          }

          const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
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
          readable.push(processedBuffer);
          readable.push(null);
          readable.pipe(uploadStream);
        });
        return result;
      }
    } catch (err: any) {
      console.warn('⚠️ Cloudinary upload failed, falling back to local disk storage:', err?.message || err);
    }

    // Local Disk Storage Fallback
    const ext = isSvg ? 'svg' : 'webp';
    const filename = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = path.join(this.uploadsDir, filename);
    await fs.promises.writeFile(filePath, processedBuffer);

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
    if (!publicId) return;

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
   * Upload brand setting images (logo, qr, signature, stamp, thankYou)
   */
  async uploadSettingsImage(
    buffer: Buffer,
    type: 'logo' | 'qr' | 'signature' | 'stamp' | 'thankYou',
    originalName?: string
  ): Promise<{ url: string; publicId: string }> {
    const folder = `np-computer/settings/${type}`;
    return this.upload(buffer, folder, originalName);
  }
}
