import { BaseWarrantyProvider } from './base.provider';
import { WarrantySearchParams, WarrantySearchStatus } from '../types';

/**
 * 1. ASUS Official Warranty Provider
 */
export class AsusProvider extends BaseWarrantyProvider {
  id = 'asus';
  name = 'ASUS Official';
  type = 'MANUFACTURER' as const;
  website = 'https://www.asus.com/vn/';
  lookupUrl = 'https://www.asus.com/vn/support/warranty-status-inquiry/';
  supportedBrands = ['ASUS', 'ROG', 'TUF Gaming', 'ProArt'];
  supportedProductTypes = ['Mainboard', 'VGA', 'Laptop', 'Màn hình', 'Router', 'PSU'];

  protected async executeSearch(serialNumber: string, params: WarrantySearchParams) {
    const cleanSerial = serialNumber.toUpperCase().trim();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.defaultTimeoutMs);

    try {
      // Endpoint tra cứu công khai của Asus Support API
      const res = await fetch(`https://rog.asus.com/api/v1/support/warranty?sn=${encodeURIComponent(cleanSerial)}`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'application/json',
        },
      }).catch(() => null);

      if (res && res.ok) {
        const data: any = await res.json().catch(() => null);
        if (data && data.warrantyEndDate) {
          return {
            status: 'ACTIVE' as WarrantySearchStatus,
            productName: data.productName || params.model || 'Sản phẩm ASUS',
            warrantyStartDate: this.parseDate(data.warrantyStartDate),
            warrantyEndDate: this.parseDate(data.warrantyEndDate),
            warrantyType: data.warrantyType || 'Bảo hành chính hãng ASUS Việt Nam',
            sourceUrl: this.lookupUrl,
          };
        }
      }
    } catch (e) {
      // Bỏ qua lỗi mạng
    } finally {
      clearTimeout(timeout);
    }

    // Format serial chuẩn ASUS (thường dài 12 - 15 ký tự, bắt đầu bằng chữ cái: L, M, N, R, S...)
    const isAsusSerialPattern = /^[A-Z0-9]{12,15}$/.test(cleanSerial);
    const directUrl = `https://www.asus.com/vn/support/warranty-status-inquiry/?sn=${encodeURIComponent(cleanSerial)}`;

    if (!isAsusSerialPattern && cleanSerial.length < 8) {
      return {
        status: 'NOT_FOUND' as WarrantySearchStatus,
        notes: 'Serial không khớp định dạng ASUS (12 - 15 ký tự)',
        sourceUrl: directUrl,
      };
    }

    // Tự động hóa Puppeteer: Mở trang ASUS, tích chọn đồng ý điều khoản và trích xuất kết quả tự động
    try {
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      });

      try {
        const page = await browser.newPage();
        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        );
        await page.setViewport({ width: 1280, height: 800 });

        await page.goto(directUrl, { waitUntil: 'networkidle2', timeout: 25000 });

        const privacyCheckbox = await page.waitForSelector('#checkPrivacy', { timeout: 8000 }).catch(() => null);
        if (privacyCheckbox) {
          await page.click('#checkPrivacy');

          await page.evaluate(() => {
            const doc = (globalThis as any).document;
            const buttons: any[] = Array.from(doc.querySelectorAll('button, input[type="submit"], a'));
            const submitBtn = buttons.find((b: any) => b.innerText && b.innerText.includes('Hoàn tất'));
            if (submitBtn) submitBtn.click();
          });

          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => null);

          const result = await page.evaluate(() => {
            const doc = (globalThis as any).document;
            const text = doc.body.innerText;
            const modelMatch = text.match(/Tên model:\s*[\r\n]+([^\r\n]+)/i);
            const model = modelMatch ? modelMatch[1].trim() : null;

            const isGood = text.includes('Còn thời hạn bảo hành');
            const isExpired = text.includes('Hết thời hạn bảo hành');

            const startDateMatch = text.match(/Ngày bắt đầu:\s*[\r\n]+([0-9]{4}[/-][0-9]{1,2}[/-][0-9]{1,2})/i);
            const endDateMatch = text.match(/Ngày hết hạn bảo hành:\s*[\r\n]+([0-9]{4}[/-][0-9]{1,2}[/-][0-9]{1,2})/i);

            return {
              model,
              isGood,
              isExpired,
              startDate: startDateMatch ? startDateMatch[1] : null,
              endDate: endDateMatch ? endDateMatch[1] : null,
            };
          });

          if (result && (result.isGood || result.isExpired || result.endDate)) {
            return {
              status: (result.isGood ? 'ACTIVE' : result.isExpired ? 'EXPIRED' : 'ACTIVE') as WarrantySearchStatus,
              productName: result.model || params.model || 'Sản phẩm ASUS',
              warrantyStartDate: this.parseDate(result.startDate),
              warrantyEndDate: this.parseDate(result.endDate),
              warrantyType: 'Bảo hành chính hãng ASUS Việt Nam',
              sourceUrl: directUrl,
              notes: 'Tự động kiểm tra và trích xuất thành công từ Cổng tra cứu ASUS Official.',
            };
          }
        }
      } finally {
        await browser.close().catch(() => null);
      }
    } catch (e) {
      // Fallback về hướng dẫn thủ công nếu Puppeteer gặp sự cố
    }

    return {
      status: 'NOT_FOUND' as WarrantySearchStatus,
      notes: '⚠️ Cổng ASUS bắt buộc người dùng: 1) Tích chọn checkbox "Tôi đồng ý cung cấp số serial...", 2) Nhấn nút [Hoàn tất]. Bấm vào liên kết bên cạnh (đã điền sẵn Serial) để xem kết quả ngay.',
      sourceUrl: directUrl,
    };
  }
}

/**
 * 2. GIGABYTE / AORUS Warranty Provider
 */
export class GigabyteProvider extends BaseWarrantyProvider {
  id = 'gigabyte';
  name = 'GIGABYTE / AORUS';
  type = 'MANUFACTURER' as const;
  website = 'https://www.gigabyte.com/vn';
  lookupUrl = 'https://www.gigabyte.com/vn/Support/Consumer/Warranty';
  supportedBrands = ['GIGABYTE', 'AORUS'];
  supportedProductTypes = ['Mainboard', 'VGA', 'Laptop', 'Màn hình', 'PSU', 'SSD'];

  protected async executeSearch(serialNumber: string, params: WarrantySearchParams) {
    const cleanSerial = serialNumber.toUpperCase().trim();
    // Gigabyte serial thường dài 12 hoặc 13 số/chữ, ví dụ SN234567890123
    const isGigaPattern = /^SN[0-9]{10,12}$/i.test(cleanSerial) || /^[0-9]{12,14}$/.test(cleanSerial);

    if (!isGigaPattern && cleanSerial.length < 9) {
      return {
        status: 'NOT_FOUND' as WarrantySearchStatus,
        notes: 'Serial không khớp định dạng Gigabyte (Bắt đầu bằng SN hoặc dãy số 12 ký tự)',
      };
    }

    return {
      status: 'NOT_FOUND' as WarrantySearchStatus,
      notes: 'Hệ thống GIGABYTE VN phân phối chủ yếu qua Viễn Sơn & Thủy Linh. Hãy kiểm tra qua kênh Nhà phân phối.',
      sourceUrl: this.lookupUrl,
    };
  }
}

/**
 * 3. Acer Vietnam Warranty Provider
 */
export class AcerProvider extends BaseWarrantyProvider {
  id = 'acer';
  name = 'Acer Vietnam';
  type = 'MANUFACTURER' as const;
  website = 'https://www.acer.com/vn-vi';
  lookupUrl = 'https://www.acer.com/vn-vi/support';
  supportedBrands = ['Acer', 'Predator'];
  supportedProductTypes = ['Laptop', 'Màn hình', 'PC Nguyên bộ'];

  protected async executeSearch(serialNumber: string, params: WarrantySearchParams) {
    const cleanSerial = serialNumber.toUpperCase().trim();
    // Acer S/N có 22 ký tự hoặc SNID có 11-12 chữ số
    const isAcerSnid = /^\d{11,12}$/.test(cleanSerial);
    const isAcerSn = /^[A-Z0-9]{22}$/.test(cleanSerial);

    if (!isAcerSnid && !isAcerSn && cleanSerial.length < 8) {
      return {
        status: 'NOT_FOUND' as WarrantySearchStatus,
        notes: 'Serial hoặc SNID không đúng chuẩn Acer (S/N 22 ký tự hoặc SNID 11-12 số)',
      };
    }

    return {
      status: 'NOT_FOUND' as WarrantySearchStatus,
      notes: 'Tra cứu Acer cần kết hợp SNID hoặc S/N 22 số. Vui lòng kiểm tra tem đáy thiết bị.',
      sourceUrl: this.lookupUrl,
    };
  }
}

/**
 * 4. Lenovo Support Warranty Provider
 */
export class LenovoProvider extends BaseWarrantyProvider {
  id = 'lenovo';
  name = 'Lenovo Support';
  type = 'MANUFACTURER' as const;
  website = 'https://www.lenovo.com/vn/vi/';
  lookupUrl = 'https://pcsupport.lenovo.com/vn/vi/warranty-lookup';
  supportedBrands = ['Lenovo', 'Legion', 'ThinkPad', 'ThinkBook', 'IdeaPad'];
  supportedProductTypes = ['Laptop', 'Màn hình', 'PC Nguyên bộ'];

  protected async executeSearch(serialNumber: string, params: WarrantySearchParams) {
    const cleanSerial = serialNumber.toUpperCase().trim();
    // Lenovo S/N thường có 8 ký tự (chữ và số)
    const isLenovoPattern = /^[A-Z0-9]{8}$/.test(cleanSerial);

    const directUrl = `https://pcsupport.lenovo.com/vn/vi/products/search?query=${encodeURIComponent(cleanSerial)}`;

    if (!isLenovoPattern && cleanSerial.length < 7) {
      return {
        status: 'NOT_FOUND' as WarrantySearchStatus,
        notes: 'Serial Lenovo thường gồm đúng 8 ký tự chữ và số',
        sourceUrl: directUrl,
      };
    }

    return {
      status: 'NOT_FOUND' as WarrantySearchStatus,
      notes: 'Xem thông tin bảo hành Lenovo trực tiếp theo số Serial trên pcsupport.lenovo.com.',
      sourceUrl: directUrl,
    };
  }
}

/**
 * 5. Dell Technologies Warranty Provider
 */
export class DellProvider extends BaseWarrantyProvider {
  id = 'dell';
  name = 'Dell Technologies';
  type = 'MANUFACTURER' as const;
  website = 'https://www.dell.com/vi-vn';
  lookupUrl = 'https://www.dell.com/support/home/vi-vn?app=warranty';
  supportedBrands = ['Dell', 'Alienware', 'Latitude', 'Vostro', 'OptiPlex'];
  supportedProductTypes = ['Laptop', 'Màn hình', 'PC Nguyên bộ'];

  protected async executeSearch(serialNumber: string, params: WarrantySearchParams) {
    const cleanSerial = serialNumber.toUpperCase().trim();
    const directUrl = `https://www.dell.com/support/home/vi-vn/product-support/servicetag/${encodeURIComponent(cleanSerial)}/overview`;
    // Dell Service Tag chuẩn 7 ký tự (VD: 8GQ29T2) hoặc Express Service Code (10-11 số)
    const isServiceTag = /^[A-Z0-9]{7}$/.test(cleanSerial);
    const isExpressCode = /^\d{10,11}$/.test(cleanSerial);

    if (!isServiceTag && !isExpressCode && cleanSerial.length < 7) {
      return {
        status: 'NOT_FOUND' as WarrantySearchStatus,
        notes: 'Service Tag của Dell phải gồm đúng 7 ký tự (hoặc Express Code 10-11 số)',
        sourceUrl: directUrl,
      };
    }

    return {
      status: 'NOT_FOUND' as WarrantySearchStatus,
      notes: 'Bấm liên kết để kiểm tra chi tiết theo Service Tag: ' + cleanSerial,
      sourceUrl: directUrl,
    };
  }
}

/**
 * 6. ASRock Official Warranty Provider
 */
export class AsrockProvider extends BaseWarrantyProvider {
  id = 'asrock';
  name = 'ASRock Official';
  type = 'MANUFACTURER' as const;
  website = 'https://www.asrock.com/';
  lookupUrl = 'https://www.asrock.com/support/index.asp';
  supportedBrands = ['ASRock'];
  supportedProductTypes = ['Mainboard', 'VGA'];

  protected async executeSearch(serialNumber: string, params: WarrantySearchParams) {
    const cleanSerial = serialNumber.toUpperCase().trim();
    return {
      status: 'NOT_FOUND' as WarrantySearchStatus,
      notes: 'Sản phẩm ASRock tại VN được bảo hành chính hãng qua NPP SPC (Vĩnh Xuân) và Synnex FPT.',
      sourceUrl: this.lookupUrl,
    };
  }
}

/**
 * 7. Seagate Verify Warranty Provider
 */
export class SeagateProvider extends BaseWarrantyProvider {
  id = 'seagate';
  name = 'Seagate Verify';
  type = 'MANUFACTURER' as const;
  website = 'https://www.seagate.com/vn/vi/';
  lookupUrl = 'https://www.seagate.com/vn/vi/support/warranty-and-replacements/';
  supportedBrands = ['Seagate', 'Barracuda', 'IronWolf', 'SkyHawk', 'FireCuda'];
  supportedProductTypes = ['HDD', 'SSD'];

  protected async executeSearch(serialNumber: string, params: WarrantySearchParams) {
    const cleanSerial = serialNumber.toUpperCase().trim();
    // Seagate Serial có 8 ký tự chữ số
    const isSeagateSn = /^[A-Z0-9]{8}$/.test(cleanSerial);

    if (!isSeagateSn && cleanSerial.length < 8) {
      return {
        status: 'NOT_FOUND' as WarrantySearchStatus,
        notes: 'Serial ổ cứng Seagate thường gồm đúng 8 ký tự (Ví dụ: Z1D34567)',
      };
    }

    return {
      status: 'NOT_FOUND' as WarrantySearchStatus,
      notes: 'Kiểm tra bảo hành Seagate chính hãng cần cung cấp S/N 8 ký tự trên tem ổ đĩa.',
      sourceUrl: this.lookupUrl,
    };
  }
}

/**
 * 8. Western Digital (WD) Warranty Provider
 */
export class WesternDigitalProvider extends BaseWarrantyProvider {
  id = 'wd';
  name = 'Western Digital (WD)';
  type = 'MANUFACTURER' as const;
  website = 'https://www.westerndigital.com/';
  lookupUrl = 'https://support-en.wd.com/app/warrantystatusweb';
  supportedBrands = ['Western Digital', 'WD', 'SanDisk'];
  supportedProductTypes = ['HDD', 'SSD'];

  protected async executeSearch(serialNumber: string, params: WarrantySearchParams) {
    const cleanSerial = serialNumber.toUpperCase().trim();
    // WD serial thường có 12 ký tự WDC... hoặc chữ số
    return {
      status: 'NOT_FOUND' as WarrantySearchStatus,
      notes: 'Chưa có thông tin bảo hành từ máy chủ WD. Vui lòng đối chiếu với tem Synnex FPT hoặc Viễn Sơn.',
      sourceUrl: this.lookupUrl,
    };
  }
}

/**
 * 9. Kingston Technology Warranty Provider
 */
export class KingstonProvider extends BaseWarrantyProvider {
  id = 'kingston';
  name = 'Kingston Technology';
  type = 'MANUFACTURER' as const;
  website = 'https://www.kingston.com/vn';
  lookupUrl = 'https://www.kingston.com/vn/support/warranty';
  supportedBrands = ['Kingston', 'FURY'];
  supportedProductTypes = ['RAM', 'SSD'];

  protected async executeSearch(serialNumber: string, params: WarrantySearchParams) {
    const cleanSerial = serialNumber.toUpperCase().trim();
    return {
      status: 'NOT_FOUND' as WarrantySearchStatus,
      notes: 'Kingston bảo hành thông qua tem phân phối SPC (Vĩnh Xuân), FPT hoặc Viễn Sơn.',
      sourceUrl: this.lookupUrl,
    };
  }
}
