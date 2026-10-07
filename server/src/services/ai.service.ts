import { config } from '../config';
import { ImageService } from './image.service';
import { AppError } from './product.service';

const imageService = new ImageService();

export class AiService {
  /**
   * Generates 3 product image candidates using OpenAI Image Generation API.
   * Requires product name.
   */
  async generateProductImages(data: {
    name: string;
    category?: string;
    brand?: string;
    model?: string;
    customPrompt?: string;
  }): Promise<{ images: string[]; prompt: string }> {
    const { name, category, brand, model, customPrompt } = data;
    if (!name || !name.trim()) {
      throw new AppError('Vui lòng nhập Tên sản phẩm trước khi tạo ảnh AI', 400);
    }

    const apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new AppError('Chưa cấu hình OPENAI_API_KEY trong hệ thống', 500);
    }

    // Formulate a crisp, realistic hardware photography prompt
    const basePrompt =
      customPrompt ||
      `Commercial studio product photography of computer hardware: "${name}". ` +
      `Category: ${category || 'computer hardware'}, Brand: ${brand || ''}, Model: ${model || ''}. ` +
      `Isolated on a sleek modern clean dark gradient studio background, 4k ultra-detailed, crisp lighting, realistic reflection, commercial catalog packaging.`;

    const angles = [
      'front 3/4 perspective hero shot',
      'isometric top-angled clean studio photography',
      'detailed hardware component shot',
    ];

    try {
      const fetchImageVariation = async (angle: string) => {
        const promptText = `${basePrompt} (${angle})`.slice(0, 1000);
        try {
          const res = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: 'gpt-image-1',
              prompt: promptText,
              n: 1,
            }),
          });

          const json: any = await res.json();
          if (res.ok && json.data && json.data.length > 0) {
            const item = json.data[0];
            if (item.b64_json) {
              return `data:image/png;base64,${item.b64_json}`;
            }
            if (item.url) {
              return item.url;
            }
          } else {
            console.warn(`gpt-image-1 returned error:`, json.error?.message);
          }
        } catch (e) {
          console.warn(`Fetch error for angle ${angle}:`, e);
        }
        return null;
      };

      // Generate 3 variations in parallel
      const results = await Promise.allSettled(
        angles.map((angle) => fetchImageVariation(angle))
      );

      const images: string[] = results
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled' && Boolean(r.value))
        .map((r) => r.value);

      if (images.length > 0) {
        return { images, prompt: basePrompt };
      }

      throw new AppError('OpenAI không trả về hình ảnh nào hợp lệ. Vui lòng thử lại.', 400);
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(`Lỗi kết nối OpenAI: ${err?.message || err}`, 500);
    }
  }

  /**
   * Downloads or decodes a generated image from OpenAI and uploads permanently to Cloudinary/Disk.
   */
  async saveGeneratedImage(imageUrl: string, productName?: string): Promise<{ url: string; publicId: string }> {
    if (!imageUrl) throw new AppError('Thiếu URL hình ảnh cần lưu', 400);

    try {
      let buffer: Buffer;

      if (imageUrl.startsWith('data:image/')) {
        const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
        buffer = Buffer.from(base64Data, 'base64');
      } else {
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new AppError('Không thể tải hình ảnh từ OpenAI để lưu vào hệ thống', 400);
        }
        const arrayBuffer = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      }

      const cleanName = (productName || 'product')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .slice(0, 40);

      const uploadResult = await imageService.upload(
        buffer,
        'np-computer/products',
        `${cleanName}_${Date.now()}.webp`
      );

      return uploadResult;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(`Lỗi lưu hình ảnh: ${err?.message || err}`, 500);
    }
  }

  /**
   * Upload direct image buffer from multipart upload.
   */
  async uploadDirectImage(buffer: Buffer, originalName?: string): Promise<{ url: string; publicId: string }> {
    return imageService.upload(buffer, 'np-computer/products', originalName);
  }

  /**
   * Suggests product specs, brand, model and description using Google Gemini with automatic OpenAI fallback.
   */
  async suggestProductSpecs(name: string, category?: string): Promise<any> {
    if (!name || !name.trim()) {
      throw new AppError('Vui lòng nhập Tên sản phẩm để AI gợi ý thông số', 400);
    }

    const prompt =
      `Bạn là chuyên gia kỹ thuật phần cứng máy tính cho cửa hàng linh kiện PC. ` +
      `Hãy phân tích tên linh kiện sau: "${name.trim()}" (Danh mục gợi ý: ${category || 'Linh kiện máy tính'}).\n` +
      `Trả về kết quả DUY NHẤT dưới dạng JSON hợp lệ (không chứa markdown code block, chỉ thuần JSON object) với các trường:\n` +
      `{\n` +
      `  "brand": "Thương hiệu sản xuất",\n` +
      `  "model": "Mã model",\n` +
      `  "description": "Mô tả ngắn gọn đặc điểm nổi bật 1-2 câu",\n` +
      `  "specs": {\n` +
      `    "cpu": "Xung nhịp, số nhân luồng, socket nếu là CPU",\n` +
      `    "mainboard": "Socket, chipset nếu là Mainboard",\n` +
      `    "ram": "Dung lượng, bus, chuẩn DDR nếu là RAM",\n` +
      `    "ssd": "Dung lượng, chuẩn M.2/SATA, tốc độ đọc ghi nếu là SSD",\n` +
      `    "hdd": "Dung lượng, vòng quay RPM nếu là HDD",\n` +
      `    "vga": "VRAM, cổng xuất hình nếu là VGA",\n` +
      `    "psu": "Công suất Watt, chuẩn 80 Plus nếu là Nguồn",\n` +
      `    "case": "Kích thước, form factor nếu là Case",\n` +
      `    "cooler": "Loại tản nhiệt nếu là Tản",\n` +
      `    "windows": "Phiên bản Windows nếu có",\n` +
      `    "office": "Phiên bản Office nếu có",\n` +
      `    "accessories": "Phụ kiện đi kèm nếu có",\n` +
      `    "notes": "Ghi chú tương thích nếu có"\n` +
      `  }\n` +
      `}`;

    const sanitizeResult = (parsed: any) => {
      if (!parsed) return parsed;
      if (parsed.specs && typeof parsed.specs === 'object') {
        const cleaned: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed.specs)) {
          if (v !== null && v !== undefined) {
            if (typeof v === 'object') {
              cleaned[k] = Object.entries(v as any)
                .map(([subK, subV]) => `${subK}: ${subV}`)
                .join(', ');
            } else if (String(v).trim()) {
              cleaned[k] = String(v).trim();
            }
          }
        }
        parsed.specs = cleaned;
      }
      return parsed;
    };

    // Use Google Gemini exclusively
    const geminiKey = config.geminiApiKey || process.env.GEMINI_API_KEY;
    if (!geminiKey || !geminiKey.trim()) {
      throw new AppError('Chưa cấu hình GEMINI_API_KEY trong hệ thống', 500);
    }

    const geminiModels = [
      'gemini-flash-lite-latest',
      'gemini-flash-latest',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
      'gemini-3.5-flash',
    ];
    let lastError: any = null;

    for (const m of geminiModels) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${geminiKey.trim()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
              },
            }),
          }
        );

        if (res.ok) {
          const data: any = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            if (parsed && (parsed.brand || parsed.model || parsed.specs || parsed.description)) {
              return sanitizeResult(parsed);
            }
          }
        } else {
          const errBody: any = await res.json().catch(() => ({}));
          console.warn(`Gemini model ${m} error:`, errBody);
          lastError = errBody?.error?.message || `HTTP ${res.status}`;
        }
      } catch (e: any) {
        console.warn(`Gemini model ${m} fetch error:`, e);
        lastError = e?.message || e;
      }
    }

    throw new AppError(`Không thể lấy thông số từ Gemini AI: ${lastError || 'Lỗi phản hồi'}`, 500);
  }
}
