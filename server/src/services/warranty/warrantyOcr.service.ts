import crypto from 'crypto';
import { config } from '../../config';
import { AppError } from '../product.service';
import { OcrExtractedFields, OcrResultDto } from './types';

// In-memory cache for OCR sessions (allows confirming / editing before search)
const ocrSessionStore = new Map<
  string,
  {
    sessionId: string;
    fields: OcrExtractedFields;
    confirmedFields?: OcrExtractedFields;
    imageUrl?: string;
    createdAt: Date;
  }
>();

// Clean up old sessions (> 2 hours)
setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [key, val] of ocrSessionStore.entries()) {
    if (val.createdAt.getTime() < cutoff) {
      ocrSessionStore.delete(key);
    }
  }
}, 30 * 60 * 1000);

export class WarrantyOcrService {
  /**
   * STAGE 1 — IMAGE OCR
   * Sends image to Gemini Vision for STRICT visible text extraction ONLY.
   * MUST NOT search warranty, MUST NOT guess expiration or warranty status.
   */
  async processImageOcr(
    imageBuffer: Buffer,
    mimeType: string = 'image/jpeg'
  ): Promise<OcrResultDto> {
    const geminiKey = config.geminiApiKey || process.env.GEMINI_API_KEY;
    if (!geminiKey || !geminiKey.trim()) {
      throw new AppError('Chưa cấu hình GEMINI_API_KEY trong hệ thống', 500);
    }

    const base64Data = imageBuffer.toString('base64');
    const sessionId = `ocr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const prompt = `You are a specialized Computer Hardware Label and Box OCR Parser.
Analyze this hardware label/box image and extract ONLY the visible text printed on the label/box/sticker.

RULES:
1. Extract ONLY visible information directly readable in the image.
2. DO NOT search warranty.
3. DO NOT determine warranty status or expiration dates.
4. DO NOT guess, fabricate or infer any warranty data.
5. Identify:
   - "brand" / manufacturer (e.g. ASUS, GIGABYTE, MSI, Acer, Lenovo, Dell, ASRock, Seagate, Western Digital, Kingston...)
   - "productName" (e.g. ASUS ROG Strix GeForce RTX 5070 Gaming OC)
   - "model" (e.g. RTX 5070, B760M, 870 EVO)
   - "serialNumber": Look for "S/N", "Serial", "SN", or barcodes. Extract exact alphanumeric string.
   - "partNumber": Look for "P/N", "Part No", "Model Code" (e.g. 90YV0..., GV-N407...)
   - "distributor": Look for distributor stickers or logos in Vietnam (e.g. Mai Hoàng, Synnex FPT, Viễn Sơn, Thủy Linh, Digiworld, VSP, SPC, An Phát, HACOM, GearVN...)
   - "productType": One of: VGA, Mainboard, CPU, RAM, SSD, HDD, PSU, Case, Màn hình, Laptop, Phụ kiện, Other.
   - "confidence": A score between 0.0 and 1.0 representing how clearly the Serial Number and Brand were read.

Return a STRICT JSON object (no markdown, no code block) formatted as:
{
  "brand": string | null,
  "productName": string | null,
  "model": string | null,
  "serialNumber": string | null,
  "partNumber": string | null,
  "distributor": string | null,
  "productType": string | null,
  "confidence": number,
  "rawText": string | null
}`;

    const geminiModels = [
      'gemini-flash-lite-latest',
      'gemini-flash-latest',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
      'gemini-3.5-flash',
    ];
    let lastError: any = null;

    for (const model of geminiModels) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey.trim()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inlineData: {
                        mimeType,
                        data: base64Data,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1,
              },
            }),
          }
        );

        if (response.ok) {
          const data: any = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);

            const fields: OcrExtractedFields = {
              brand: parsed.brand || undefined,
              productName: parsed.productName || undefined,
              model: parsed.model || undefined,
              serialNumber: parsed.serialNumber?.trim() || undefined,
              partNumber: parsed.partNumber?.trim() || undefined,
              distributor: parsed.distributor?.trim() || undefined,
              productType: parsed.productType || undefined,
              confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
              rawText: parsed.rawText || undefined,
            };

            // Store in session store
            ocrSessionStore.set(sessionId, {
              sessionId,
              fields,
              createdAt: new Date(),
            });

            return {
              sessionId,
              fields,
              confidence: fields.confidence || 0.85,
              message: 'Trích xuất thông tin OCR từ hình ảnh thành công.',
            };
          }
        } else {
          const errBody: any = await response.json().catch(() => ({}));
          console.warn(`Gemini OCR model ${model} error:`, errBody);
          lastError = errBody?.error?.message || `HTTP ${response.status}`;
        }
      } catch (err: any) {
        console.warn(`Gemini OCR model ${model} fetch exception:`, err);
        lastError = err?.message || err;
      }
    }

    throw new AppError(
      `Không thể đọc hình ảnh qua Gemini Vision: ${lastError || 'Lỗi nhận dạng ảnh'}`,
      500
    );
  }

  /**
   * STAGE 3 — USER CONFIRMS DATA
   * Confirms / updates the OCR extracted data.
   * MUST NOT trigger warranty search.
   */
  async confirmOcrData(
    sessionId: string,
    confirmedFields: OcrExtractedFields
  ): Promise<{ success: boolean; sessionId: string; confirmedFields: OcrExtractedFields }> {
    const session = ocrSessionStore.get(sessionId);

    if (session) {
      session.confirmedFields = { ...session.fields, ...confirmedFields };
      ocrSessionStore.set(sessionId, session);
    } else {
      ocrSessionStore.set(sessionId, {
        sessionId,
        fields: confirmedFields,
        confirmedFields,
        createdAt: new Date(),
      });
    }

    return {
      success: true,
      sessionId,
      confirmedFields,
    };
  }

  /**
   * Gets session data if exists
   */
  getSession(sessionId: string) {
    return ocrSessionStore.get(sessionId);
  }
}
