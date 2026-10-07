import { BaseWarrantyProvider } from './base.provider';
import { WarrantySearchParams, WarrantySearchStatus } from '../types';

/**
 * 10. Mai Hoàng Informatics (Phân phối MSI, DareU, Corsair...)
 */
export class MaiHoangProvider extends BaseWarrantyProvider {
  id = 'mai_hoang';
  name = 'Mai Hoàng Informatics';
  type = 'DISTRIBUTOR' as const;
  website = 'https://maihoang.com.vn';
  lookupUrl = 'https://maihoang.com.vn/pages/kiem-tra-serial-bao-hanh';
  supportedBrands = ['MSI', 'Corsair', 'DareU', 'Huntkey', 'Biostar', 'FSP', 'G.Skill'];

  protected async executeSearch(serialNumber: string, params: WarrantySearchParams) {
    const cleanSerial = serialNumber.trim();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.defaultTimeoutMs);

    try {
      // Thực hiện kiểm tra tra cứu trực tuyến qua API Mai Hoàng
      const res = await fetch('https://api.maihoang.com.vn/common/excutecommand', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          token: 'C5CF614B-35CB-CBA3-C4A4-1DC1E6840FAC',
          companyId: '000',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: JSON.stringify({
          command: 'ThongTinBaoHanh',
          params: {
            ma_vach: cleanSerial,
          },
        }),
      }).catch(() => null);

      if (res && res.ok) {
        const json: any = await res.json().catch(() => null);
        if (json && json.status?.code === 200 && Array.isArray(json.data) && json.data.length > 0) {
          const item = json.data[0];
          return {
            status: 'ACTIVE' as WarrantySearchStatus,
            productName: item.ten_vt || params.model || 'Sản phẩm Mai Hoàng',
            warrantyEndDate: this.parseDate(item.ngay_hh_bh),
            warrantyType: 'Bảo hành chính hãng Mai Hoàng',
            sourceUrl: this.lookupUrl,
            notes: item.ten_kh ? `Khách hàng: ${item.ten_kh}` : undefined,
          };
        }
      }
    } catch (e) {
      // Graceful error fallback
    } finally {
      clearTimeout(timeout);
    }

    return {
      status: 'NOT_FOUND' as WarrantySearchStatus,
      notes: 'Không tìm thấy thông tin trên hệ thống Mai Hoàng. Vui lòng đối chiếu tem tròn hoặc mã QR dán trên sản phẩm.',
      sourceUrl: this.lookupUrl,
    };
  }
}

/**
 * 11. Digiworld / DGCare
 */
export class DigiworldProvider extends BaseWarrantyProvider {
  id = 'digiworld';
  name = 'Digiworld (DGCare)';
  type = 'DISTRIBUTOR' as const;
  website = 'https://ict.digiworld.com.vn';
  lookupUrl = 'https://ict.digiworld.com.vn/tra-cuu-han-bao-hanh.html';
  supportedBrands = ['Xiaomi', 'Dell', 'HP', 'Acer', 'ASUS', 'Inno3D', 'PNY', 'Lexar'];

  protected async executeSearch(serialNumber: string, params: WarrantySearchParams) {
    const cleanSerial = serialNumber.trim();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.defaultTimeoutMs);

    try {
      const res = await fetch('https://ict.digiworld.com.vn/index.php?module=search&view=serial&task=fetch_pages&raw=1', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: 'https://ict.digiworld.com.vn/tra-cuu-han-bao-hanh.html',
        },
        body: `page=0&serial_number=${encodeURIComponent(cleanSerial)}`,
      }).catch(() => null);

      if (res && res.ok) {
        const html = await res.text().catch(() => '');
        if (html && !html.includes('Không tìm thấy sản phẩm') && html.includes('<table')) {
          // Bóc tách thông tin sản phẩm và ngày hết hạn trong bảng
          const dateMatches = html.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b/g);
          const endDate = dateMatches && dateMatches.length > 0 ? dateMatches[dateMatches.length - 1] : undefined;

          return {
            status: 'ACTIVE' as WarrantySearchStatus,
            productName: params.model || 'Sản phẩm Digiworld',
            warrantyEndDate: this.parseDate(endDate),
            warrantyType: 'Bảo hành phân phối Digiworld (DGCare)',
            sourceUrl: this.lookupUrl,
          };
        }
      }
    } catch (e) {
      // Graceful error fallback
    } finally {
      clearTimeout(timeout);
    }

    return {
      status: 'NOT_FOUND' as WarrantySearchStatus,
      notes: 'Chưa có thông tin tại trung tâm DGCare Digiworld. Vui lòng kiểm tra tem bảo hành Digiworld chính hãng.',
      sourceUrl: this.lookupUrl,
    };
  }
}

/**
 * 12. VSP Technology Ecosystem
 */
export class VspProvider extends BaseWarrantyProvider {
  id = 'vsp';
  name = 'VSP Technology';
  type = 'DISTRIBUTOR' as const;
  website = 'https://baohanh.vsp.vn';
  lookupUrl = 'https://baohanh.vsp.vn/check-serial';
  supportedBrands = ['VSP', 'Techware', 'Aigo', 'Bosston', 'Vision'];

  protected async executeSearch(serialNumber: string, params: WarrantySearchParams) {
    const cleanSerial = serialNumber.trim();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.defaultTimeoutMs);

    try {
      const res = await fetch('https://baohanh.vsp.vn/page/ajax/checkserial', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: 'https://baohanh.vsp.vn/check-serial',
        },
        body: `serial=${encodeURIComponent(cleanSerial)}&source=input`,
      }).catch(() => null);

      if (res && res.ok) {
        const json: any = await res.json().catch(() => null);
        if (json && json.success && json.results?.status === 'success' && json.results?.data) {
          const d = json.results.data;
          return {
            status: 'ACTIVE' as WarrantySearchStatus,
            productName: d.category || params.model || 'Sản phẩm VSP',
            warrantyStartDate: this.parseDate(d.active_date || d.export_date),
            warrantyEndDate: this.parseDate(d.warranty_end),
            warrantyType: 'Bảo hành chính hãng VSP Technology Spread',
            sourceUrl: this.lookupUrl,
            notes: d.status ? `Tình trạng: ${d.status}` : undefined,
          };
        }
      }
    } catch (e) {
      // Graceful error fallback
    } finally {
      clearTimeout(timeout);
    }

    return {
      status: 'NOT_FOUND' as WarrantySearchStatus,
      notes: 'Không tìm thấy số Serial trong hệ thống VSP.',
      sourceUrl: this.lookupUrl,
    };
  }
}

/**
 * 13. Synnex FPT (Phân phối lớn Intel, ASUS, MSI, WD, Seagate...)
 */
export class SynnexFptProvider extends BaseWarrantyProvider {
  id = 'synnex_fpt';
  name = 'Synnex FPT';
  type = 'DISTRIBUTOR' as const;
  website = 'https://synnexfpt.com';
  lookupUrl = 'https://synnexfpt.com/bao-hanh/tra-cuu-san-pham-chinh-hang/';
  supportedBrands = ['Intel', 'ASUS', 'MSI', 'Western Digital', 'Seagate', 'Kingston', 'HP', 'Dell', 'Gigabyte'];

  protected async executeSearch(serialNumber: string, params: WarrantySearchParams) {
    const cleanSerial = serialNumber.trim();
    // Synnex FPT yêu cầu xác thực captcha bảo mật người dùng trực tiếp trên website
    return {
      status: 'NOT_FOUND' as WarrantySearchStatus,
      notes: '⚠️ Synnex FPT yêu cầu tích chọn xác thực captcha "[✓] Tôi không phải là người máy". Bấm liên kết bên cạnh để tra cứu trực tiếp.',
      sourceUrl: this.lookupUrl,
    };
  }
}

/**
 * 14. Viễn Sơn (Micro-Star / Gigabyte / Asus / Acer...)
 */
export class VienSonProvider extends BaseWarrantyProvider {
  id = 'vien_son';
  name = 'Viễn Sơn';
  type = 'DISTRIBUTOR' as const;
  website = 'https://service.microstar.vn';
  lookupUrl = 'https://service.microstar.vn/tracuubaohanh.php';
  supportedBrands = ['ASUS', 'GIGABYTE', 'AORUS', 'Acer', 'Corsair', 'Kingston', 'Crucial', 'Galax'];

  protected async executeSearch(serialNumber: string, params: WarrantySearchParams) {
    const cleanSerial = serialNumber.trim();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.defaultTimeoutMs);

    try {
      const res = await fetch(`https://service.microstar.vn/tracuubaohanh.php?search_term=${encodeURIComponent(cleanSerial)}&form_submitted=1`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: 'https://service.microstar.vn/tracuubaohanh.php',
        },
      }).catch(() => null);

      if (res && res.ok) {
        const html = await res.text().catch(() => '');
        if (html) {
          const brandMatch = html.match(/Brand<\/td>\s*<td[^>]*>(.*?)<\/td>/i);
          const modelMatch = html.match(/Item Model<\/td>\s*<td[^>]*>(.*?)<\/td>/i);
          const nameMatch = html.match(/Item Name<\/td>\s*<td[^>]*>(.*?)<\/td>/i);
          const warrantyMatch = html.match(/Warranty<\/td>\s*<td[^>]*>(.*?)<\/td>/i);

          const brand = brandMatch?.[1]?.replace(/<[^>]*>/g, '').trim();
          const model = modelMatch?.[1]?.replace(/<[^>]*>/g, '').trim();
          const name = nameMatch?.[1]?.replace(/<[^>]*>/g, '').trim();
          const warranty = warrantyMatch?.[1]?.replace(/<[^>]*>/g, '').trim();

          if (brand || model || name || warranty) {
            const productTitle = [brand, model, name].filter(Boolean).join(' ') || params.model || 'Sản phẩm Viễn Sơn';
            return {
              status: 'ACTIVE' as WarrantySearchStatus,
              productName: productTitle,
              warrantyEndDate: this.parseDate(warranty),
              warrantyType: 'Bảo hành phân phối Viễn Sơn',
              sourceUrl: `https://service.microstar.vn/tracuubaohanh.php?search_term=${encodeURIComponent(cleanSerial)}&form_submitted=1`,
              notes: warranty ? `Thời hạn bảo hành: ${warranty}` : undefined,
            };
          }
        }
      }
    } catch (e) {
      // Graceful error fallback
    } finally {
      clearTimeout(timeout);
    }

    return {
      status: 'NOT_FOUND' as WarrantySearchStatus,
      notes: 'Không tìm thấy Serial trên hệ thống Viễn Sơn. Hãy kiểm tra tem vàng Viễn Sơn.',
      sourceUrl: this.lookupUrl,
    };
  }
}

/**
 * 15. Thủy Linh (TLC - Phân phối Gigabyte, Kingston, Antec, Dell, Intel...)
 */
export class ThuyLinhProvider extends BaseWarrantyProvider {
  id = 'thuy_linh';
  name = 'Thủy Linh (TLC)';
  type = 'DISTRIBUTOR' as const;
  website = 'https://www.thuylinh.vn';
  lookupUrl = 'https://www.thuylinh.vn/tra-cuu-bao-hanh/';
  supportedBrands = ['GIGABYTE', 'Kingston', 'Antec', 'Dell', 'Intel', 'ADATA', 'Seagate'];

  protected async executeSearch(serialNumber: string, params: WarrantySearchParams) {
    const cleanSerial = serialNumber.trim();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.defaultTimeoutMs);

    try {
      const res = await fetch(`https://www.thuylinh.vn/global/getbaohanh.asp?lang=0&code=${encodeURIComponent(cleanSerial)}`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: 'https://www.thuylinh.vn/tra-cuu-bao-hanh/',
        },
      }).catch(() => null);

      if (res && res.ok) {
        const html = await res.text().catch(() => '');
        if (html && !html.includes('baoloi') && !html.includes('không hợp lệ')) {
          const dateMatches = html.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b/g);
          const endDate = dateMatches && dateMatches.length > 0 ? dateMatches[dateMatches.length - 1] : undefined;

          // Loại bỏ HTML tags để lấy nội dung tóm tắt
          const cleanText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

          return {
            status: 'ACTIVE' as WarrantySearchStatus,
            productName: params.model || 'Sản phẩm Thủy Linh (TLC)',
            warrantyEndDate: this.parseDate(endDate),
            warrantyType: 'Bảo hành chính hãng Thủy Linh (TLC)',
            sourceUrl: this.lookupUrl,
            notes: cleanText.length > 0 && cleanText.length < 200 ? cleanText : undefined,
          };
        }
      }
    } catch (e) {
      // Graceful error fallback
    } finally {
      clearTimeout(timeout);
    }

    return {
      status: 'NOT_FOUND' as WarrantySearchStatus,
      notes: 'Chưa có dữ liệu tra cứu tại Thủy Linh (TLC). Vui lòng đối chiếu tem TLC dán trên linh kiện.',
      sourceUrl: this.lookupUrl,
    };
  }
}

/**
 * 16. Vĩnh Xuân (SPC)
 */
export class VinhXuanProvider extends BaseWarrantyProvider {
  id = 'vinh_xuan';
  name = 'Vĩnh Xuân (SPC)';
  type = 'DISTRIBUTOR' as const;
  website = 'https://spc.com.vn';
  lookupUrl = 'https://spc.com.vn/checkserial';
  supportedBrands = ['ASUS', 'MSI', 'Philips', 'ASRock', 'TeamGroup', 'Dell', 'Gigabyte', 'AOC', 'Dahua'];

  protected async executeSearch(serialNumber: string, params: WarrantySearchParams) {
    const cleanSerial = serialNumber.trim();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.defaultTimeoutMs);

    try {
      // Bước 1: Lấy token và cookie từ trang checkserial
      const getRes = await fetch(this.lookupUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }).catch(() => null);

      if (getRes && getRes.ok) {
        const getHtml = await getRes.text().catch(() => '');
        const tokenMatch = getHtml.match(/name="authenticity_token"\s+value="([^"]+)"/);
        const cookie = getRes.headers.get('set-cookie') || '';

        if (tokenMatch && tokenMatch[1]) {
          const postRes = await fetch(this.lookupUrl, {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              Cookie: cookie,
              Referer: this.lookupUrl,
            },
            body: new URLSearchParams({
              authenticity_token: tokenMatch[1],
              checktype: 'info',
              serialcode: cleanSerial,
            }).toString(),
          }).catch(() => null);

          if (postRes && postRes.ok) {
            const postHtml = await postRes.text().catch(() => '');
            if (postHtml && !postHtml.includes('Không tìm thấy thông tin bảo hành')) {
              const dateMatches = postHtml.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b/g);
              const endDate = dateMatches && dateMatches.length > 0 ? dateMatches[dateMatches.length - 1] : undefined;

              return {
                status: 'ACTIVE' as WarrantySearchStatus,
                productName: params.model || 'Sản phẩm phân phối Vĩnh Xuân (SPC)',
                warrantyEndDate: this.parseDate(endDate),
                warrantyType: 'Bảo hành phân phối Vĩnh Xuân (SPC)',
                sourceUrl: this.lookupUrl,
                notes: 'Đã tìm thấy thông tin trên hệ thống SPC.',
              };
            }
          }
        }
      }
    } catch (e) {
      // Graceful error fallback
    } finally {
      clearTimeout(timeout);
    }

    return {
      status: 'NOT_FOUND' as WarrantySearchStatus,
      notes: 'Không tìm thấy thông tin trên hệ thống Vĩnh Xuân (SPC). Vui lòng đối chiếu tem SPC dán trên linh kiện.',
      sourceUrl: this.lookupUrl,
    };
  }
}

/**
 * 17. Viết Sơn
 */
export class VietSonProvider extends BaseWarrantyProvider {
  id = 'viet_son';
  name = 'Viết Sơn';
  type = 'DISTRIBUTOR' as const;
  website = 'https://www.vietsontdc.com';
  lookupUrl = 'https://www.vietsontdc.com/index?page=tra-cuu-bao-hanh-Viet-Son';
  supportedBrands = ['AMD', 'ASUS', 'Kingston', 'Lexar', 'ASRock', 'AOC', 'Palit', 'G.Skill', 'BenQ', 'Maxsun', 'PowerColor', 'Rosa', 'Uniview', 'Colorful', 'Segotep'];

  protected async executeSearch(serialNumber: string, params: WarrantySearchParams) {
    const cleanSerial = serialNumber.trim();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.defaultTimeoutMs);

    try {
      const formData = new FormData();
      formData.append('search', cleanSerial);

      const res = await fetch(this.lookupUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: this.lookupUrl,
        },
        body: formData,
      }).catch(() => null);

      if (res && res.ok) {
        const html = await res.text().catch(() => '');
        if (html && !html.includes('Không tìm thấy thông tin cho mã serial') && html.includes('result-card-item')) {
          const dateMatches = html.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b/g);
          const endDate = dateMatches && dateMatches.length > 0 ? dateMatches[dateMatches.length - 1] : undefined;

          return {
            status: 'ACTIVE' as WarrantySearchStatus,
            productName: params.model || 'Sản phẩm phân phối Viết Sơn',
            warrantyEndDate: this.parseDate(endDate),
            warrantyType: 'Bảo hành phân phối Viết Sơn',
            sourceUrl: this.lookupUrl,
            notes: 'Đã tìm thấy thông tin bảo hành trên hệ thống Viết Sơn.',
          };
        }
      }
    } catch (e) {
      // Graceful error fallback
    } finally {
      clearTimeout(timeout);
    }

    return {
      status: 'NOT_FOUND' as WarrantySearchStatus,
      notes: 'Không tìm thấy thông tin trên hệ thống Viết Sơn. Vui lòng đối chiếu tem bảo hành Viết Sơn.',
      sourceUrl: this.lookupUrl,
    };
  }
}

/**
 * 18. Vinago
 */
export class VinagoProvider extends BaseWarrantyProvider {
  id = 'vinago';
  name = 'Vinago';
  type = 'DISTRIBUTOR' as const;
  website = 'https://vinagoco.vn';
  lookupUrl = 'https://baohanh.vinagoco.vn/';
  supportedBrands = ['Vinago', 'Magicsee', 'Kobo', 'Ugoos', 'Egreat'];

  protected async executeSearch(serialNumber: string, params: WarrantySearchParams) {
    return {
      status: 'NOT_FOUND' as WarrantySearchStatus,
      notes: 'Hệ thống Vinago yêu cầu tra cứu trên ứng dụng/cổng B2B. Vui lòng truy cập cổng bảo hành Vinago để kiểm tra.',
      sourceUrl: this.lookupUrl,
    };
  }
}

/**
 * 19. Linaco
 */
export class LinacoProvider extends BaseWarrantyProvider {
  id = 'linaco';
  name = 'Linaco';
  type = 'DISTRIBUTOR' as const;
  website = 'https://www.linaco.vn';
  lookupUrl = 'https://www.linaco.vn/pages/bao-hanh-moi';
  supportedBrands = ['Linaco', 'Rapoo', 'Ajazz', 'Somic'];

  protected async executeSearch(serialNumber: string, params: WarrantySearchParams) {
    return {
      status: 'NOT_FOUND' as WarrantySearchStatus,
      notes: 'Vui lòng truy cập trang bảo hành Linaco để đối chiếu số Serial theo đơn mua.',
      sourceUrl: this.lookupUrl,
    };
  }
}

/**
 * 20. DTR Distribution
 */
export class DtrProvider extends BaseWarrantyProvider {
  id = 'dtr';
  name = 'DTR Distribution';
  type = 'DISTRIBUTOR' as const;
  website = 'https://dtr.vn';
  lookupUrl = 'https://dtr.vn/tra-cuu';
  supportedBrands = ['DTR', 'V-Color', 'GeIL', 'Hikvision', 'Netac'];

  protected async executeSearch(serialNumber: string, params: WarrantySearchParams) {
    const cleanSerial = serialNumber.trim();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.defaultTimeoutMs);

    try {
      const res = await fetch(`https://dtr.vn/tra-cuu?sn=${encodeURIComponent(cleanSerial)}`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: this.lookupUrl,
        },
      }).catch(() => null);

      if (res && res.ok) {
        const html = await res.text().catch(() => '');
        if (html && !html.includes('Không tìm thấy số Serial Number')) {
          const dateMatches = html.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b/g);
          const endDate = dateMatches && dateMatches.length > 0 ? dateMatches[dateMatches.length - 1] : undefined;

          return {
            status: 'ACTIVE' as WarrantySearchStatus,
            productName: params.model || 'Sản phẩm DTR Distribution',
            warrantyEndDate: this.parseDate(endDate),
            warrantyType: 'Bảo hành phân phối DTR',
            sourceUrl: `https://dtr.vn/tra-cuu?sn=${encodeURIComponent(cleanSerial)}`,
            notes: 'Đã tìm thấy thông tin trên hệ thống DTR.',
          };
        }
      }
    } catch (e) {
      // Graceful error fallback
    } finally {
      clearTimeout(timeout);
    }

    return {
      status: 'NOT_FOUND' as WarrantySearchStatus,
      notes: 'Không tìm thấy số Serial trên hệ thống DTR.',
      sourceUrl: this.lookupUrl,
    };
  }
}

/**
 * 21. Sintech
 */
export class SintechProvider extends BaseWarrantyProvider {
  id = 'sintech';
  name = 'Sintech';
  type = 'DISTRIBUTOR' as const;
  website = 'https://sintech.vn';
  lookupUrl = 'https://sintech.vn/pages/tra-cuu-bao-hanh';
  supportedBrands = ['Sintech', 'G.Skill', 'Thermalright', 'Lian Li', 'SilverStone'];

  protected async executeSearch(serialNumber: string, params: WarrantySearchParams) {
    return {
      status: 'NOT_FOUND' as WarrantySearchStatus,
      notes: 'Tra cứu nhanh bảo hành sản phẩm phân phối Sintech theo số Serial trên tem.',
      sourceUrl: this.lookupUrl,
    };
  }
}

/**
 * 22. Tân Phát
 */
export class TanPhatProvider extends BaseWarrantyProvider {
  id = 'tan_phat';
  name = 'Tân Phát';
  type = 'DISTRIBUTOR' as const;
  website = 'https://tanphat.com.vn';
  lookupUrl = 'https://baohanh.tanphat.com.vn/';
  supportedBrands = ['Tân Phát', 'Zebra', 'Honeywell', 'Datalogic', 'Epson', 'Bixolon'];

  protected async executeSearch(serialNumber: string, params: WarrantySearchParams) {
    return {
      status: 'NOT_FOUND' as WarrantySearchStatus,
      notes: 'Tra cứu thông tin bảo hành sản phẩm Tân Phát theo số Serial hoặc số điện thoại.',
      sourceUrl: this.lookupUrl,
    };
  }
}

/**
 * 23. Song Hùng
 */
export class SongHungProvider extends BaseWarrantyProvider {
  id = 'song_hung';
  name = 'Song Hùng';
  type = 'DISTRIBUTOR' as const;
  website = 'https://songhung.vn';
  lookupUrl = 'https://songhung.vn/tra-cuu-bao-hanh';
  supportedBrands = ['Aigo', 'DarkFlash', 'Jonsbo', 'Song Hùng'];

  protected async executeSearch(serialNumber: string, params: WarrantySearchParams) {
    return {
      status: 'NOT_FOUND' as WarrantySearchStatus,
      notes: 'Tra cứu bảo hành sản phẩm chính hãng Aigo, DarkFlash, Jonsbo phân phối bởi Song Hùng.',
      sourceUrl: this.lookupUrl,
    };
  }
}

/**
 * 24. DSG (Giải Pháp Số Toàn Cầu)
 */
export class DsgProvider extends BaseWarrantyProvider {
  id = 'dsg';
  name = 'DSG (Giải Pháp Số Toàn Cầu)';
  type = 'DISTRIBUTOR' as const;
  website = 'https://dsg.com.vn';
  lookupUrl = 'https://dsg.com.vn/bao-hanh';
  supportedBrands = ['Kodak Alaris', 'Avision', 'Colortrac', 'EPOS', 'Sennheiser'];

  protected async executeSearch(serialNumber: string, params: WarrantySearchParams) {
    return {
      status: 'NOT_FOUND' as WarrantySearchStatus,
      notes: '⚠️ DSG áp dụng xác thực captcha "[✓] Tôi không phải là người máy". Bấm liên kết bên cạnh để tra cứu trực tiếp.',
      sourceUrl: this.lookupUrl,
    };
  }
}


