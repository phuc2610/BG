import {
  IWarrantyProvider,
  WarrantyProviderType,
  WarrantySearchParams,
  ProviderSearchResult,
  WarrantySearchStatus,
} from '../types';

export abstract class BaseWarrantyProvider implements IWarrantyProvider {
  abstract id: string;
  abstract name: string;
  abstract type: WarrantyProviderType;
  logo?: string;
  website?: string;
  lookupUrl?: string;
  supportedBrands: string[] = [];
  supportedProductTypes?: string[] = [];

  protected defaultTimeoutMs = 6500;

  isCompatible(query: { brand?: string; distributor?: string; productType?: string }): boolean {
    if (this.type === 'MANUFACTURER') {
      if (!query.brand) return true;
      const targetBrand = query.brand.toLowerCase().trim();
      return this.supportedBrands.some(
        (b) => targetBrand.includes(b.toLowerCase()) || b.toLowerCase().includes(targetBrand)
      );
    }

    if (this.type === 'DISTRIBUTOR') {
      if (!query.distributor) return true;
      const targetDist = query.distributor.toLowerCase().trim();
      const thisName = this.name.toLowerCase();
      const thisId = this.id.toLowerCase();
      return thisName.includes(targetDist) || targetDist.includes(thisId) || targetDist.includes(thisName);
    }

    return true;
  }

  async search(params: WarrantySearchParams): Promise<ProviderSearchResult> {
    const startTime = Date.now();
    const cleanSerial = params.serialNumber?.trim() || '';

    if (!cleanSerial) {
      return {
        providerId: this.id,
        providerName: this.name,
        providerType: this.type,
        status: 'NOT_FOUND',
        serialNumber: cleanSerial,
        responseTimeMs: 0,
        error: 'Serial number is empty',
      };
    }

    try {
      const result = await this.executeSearch(cleanSerial, params);
      const responseTimeMs = Date.now() - startTime;

      let remainingDays: number | undefined;
      let status: WarrantySearchStatus = result.status || 'UNKNOWN';

      if (result.warrantyEndDate) {
        const now = new Date();
        const diffMs = result.warrantyEndDate.getTime() - now.getTime();
        remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (status === 'ACTIVE' || status === 'UNKNOWN') {
          status = remainingDays > 0 ? 'ACTIVE' : 'EXPIRED';
        }
      }

      return {
        providerId: this.id,
        providerName: this.name,
        providerType: this.type,
        status,
        serialNumber: cleanSerial,
        productName: result.productName || params.model,
        model: result.model || params.model,
        warrantyStartDate: result.warrantyStartDate,
        warrantyEndDate: result.warrantyEndDate,
        remainingDays,
        warrantyType: result.warrantyType,
        notes: result.notes,
        sourceUrl: result.sourceUrl || this.lookupUrl,
        responseTimeMs,
        rawResponse: result.rawResponse,
      };
    } catch (err: any) {
      const responseTimeMs = Date.now() - startTime;
      return {
        providerId: this.id,
        providerName: this.name,
        providerType: this.type,
        status: 'ERROR',
        serialNumber: cleanSerial,
        responseTimeMs,
        error: err?.message || 'Lỗi tra cứu hệ thống',
      };
    }
  }

  protected abstract executeSearch(
    serialNumber: string,
    params: WarrantySearchParams
  ): Promise<{
    status: WarrantySearchStatus;
    productName?: string;
    model?: string;
    warrantyStartDate?: Date;
    warrantyEndDate?: Date;
    warrantyType?: string;
    notes?: string;
    sourceUrl?: string;
    rawResponse?: any;
  }>;

  protected parseDate(dateStr?: string): Date | undefined {
    if (!dateStr || typeof dateStr !== 'string') return undefined;
    const clean = dateStr.trim();

    // Check DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      return new Date(year, month, day);
    }

    // Check YYYY-MM-DD
    const ymdMatch = clean.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);
      return new Date(year, month, day);
    }

    const parsed = new Date(clean);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }
}
