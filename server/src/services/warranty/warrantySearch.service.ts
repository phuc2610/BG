import { WarrantyCheckHistory, generateWarrantySearchCode } from '../../models';
import { AppError } from '../product.service';
import { WarrantyProviderRegistry } from './providers/registry';
import {
  AggregatedWarrantyResult,
  ProviderSearchResult,
  WarrantySearchMode,
  WarrantySearchParams,
} from './types';
import { WarrantyOcrService } from './warrantyOcr.service';

export class WarrantySearchService {
  private registry = WarrantyProviderRegistry.getInstance();
  private ocrService = new WarrantyOcrService();

  /**
   * ABSOLUTE SEARCH TRIGGER
   * Executes the warranty lookup across the resolved providers.
   * ONLY triggered when user explicitly requests it.
   */
  async executeSearch(data: {
    sessionId?: string;
    searchMode: WarrantySearchMode;
    serialNumber: string;
    brand?: string;
    model?: string;
    partNumber?: string;
    distributor?: string;
    productType?: string;
    selectedProviderIds?: string[];
    createdBy?: string;
  }): Promise<AggregatedWarrantyResult> {
    const cleanSerial = data.serialNumber?.trim();
    if (!cleanSerial) {
      throw new AppError('Số Serial Number là bắt buộc để tra cứu bảo hành', 400);
    }

    const searchParams: WarrantySearchParams = {
      serialNumber: cleanSerial,
      brand: data.brand?.trim(),
      model: data.model?.trim(),
      partNumber: data.partNumber?.trim(),
      distributor: data.distributor?.trim(),
      productType: data.productType?.trim(),
    };

    // 1. Resolve providers
    const targetProviders = this.registry.resolveProviders(
      data.searchMode || 'AUTO',
      searchParams,
      data.selectedProviderIds
    );

    if (targetProviders.length === 0) {
      throw new AppError('Không tìm thấy nhà cung cấp nào phù hợp với cấu hình tra cứu đã chọn', 400);
    }

    // 2. Query all resolved providers concurrently with Promise.allSettled
    const queryPromises = targetProviders.map((provider) =>
      provider.search(searchParams)
    );

    const settledResults = await Promise.allSettled(queryPromises);

    const providerResults: ProviderSearchResult[] = settledResults.map(
      (result, idx) => {
        if (result.status === 'fulfilled') {
          return result.value;
        }
        const fallbackProvider = targetProviders[idx];
        return {
          providerId: fallbackProvider.id,
          providerName: fallbackProvider.name,
          providerType: fallbackProvider.type,
          status: 'ERROR',
          serialNumber: cleanSerial,
          responseTimeMs: 0,
          error: result.reason?.message || 'Lỗi tra cứu',
        };
      }
    );

    // 3. Aggregate & Detect conflicts
    let overallStatus: 'ACTIVE' | 'EXPIRED' | 'NOT_FOUND' | 'PARTIAL' | 'ERROR' = 'NOT_FOUND';
    let primaryResult: ProviderSearchResult | undefined;
    let warrantyEndDate: Date | undefined;
    let remainingDays: number | undefined;

    const activeResults = providerResults.filter((r) => r.status === 'ACTIVE');
    const expiredResults = providerResults.filter((r) => r.status === 'EXPIRED');
    const notFoundResults = providerResults.filter((r) => r.status === 'NOT_FOUND');
    const errorResults = providerResults.filter((r) => r.status === 'ERROR');

    if (activeResults.length > 0) {
      overallStatus = 'ACTIVE';
      // Pick result with latest warrantyEndDate
      primaryResult = activeResults.reduce((prev, curr) => {
        if (!prev.warrantyEndDate) return curr;
        if (!curr.warrantyEndDate) return prev;
        return curr.warrantyEndDate.getTime() > prev.warrantyEndDate.getTime() ? curr : prev;
      }, activeResults[0]);

      warrantyEndDate = primaryResult.warrantyEndDate;
      remainingDays = primaryResult.remainingDays;
    } else if (expiredResults.length > 0) {
      overallStatus = 'EXPIRED';
      primaryResult = expiredResults[0];
      warrantyEndDate = primaryResult.warrantyEndDate;
      remainingDays = primaryResult.remainingDays;
    } else if (errorResults.length > 0 && notFoundResults.length === 0) {
      overallStatus = 'ERROR';
    } else {
      overallStatus = 'NOT_FOUND';
    }

    // Conflict detection (ví dụ: ngày hết hạn chênh lệch nhau trên 30 ngày giữa các nguồn)
    let hasConflicts = false;
    let conflictNotes = '';

    if (activeResults.length > 1) {
      const dates = activeResults
        .map((r) => r.warrantyEndDate?.getTime())
        .filter((d): d is number => Boolean(d));

      if (dates.length > 1) {
        const minDate = Math.min(...dates);
        const maxDate = Math.max(...dates);
        const diffDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
        if (diffDays > 30) {
          hasConflicts = true;
          conflictNotes = `Phát hiện chênh lệch thời hạn bảo hành giữa các nguồn (${diffDays} ngày)`;
        }
      }
    }

    // 4. Save to Database
    const searchCode = await generateWarrantySearchCode();
    const sessionData = data.sessionId ? this.ocrService.getSession(data.sessionId) : undefined;

    try {
      await WarrantyCheckHistory.create({
        searchCode,
        sessionId: data.sessionId,
        serialNumber: cleanSerial,
        brand: data.brand,
        modelName: data.model,
        partNumber: data.partNumber,
        distributor: data.distributor,
        productType: data.productType,
        searchMode: data.searchMode,
        ocrData: sessionData?.fields,
        userConfirmedData: sessionData?.confirmedFields || {
          brand: data.brand,
          model: data.model,
          serialNumber: cleanSerial,
          partNumber: data.partNumber,
          distributor: data.distributor,
          productType: data.productType,
        },
        queriedProviderIds: targetProviders.map((p) => p.id),
        providerResults: providerResults.map((r) => ({
          providerId: r.providerId,
          providerName: r.providerName,
          providerType: r.providerType,
          status: r.status,
          serialNumber: r.serialNumber,
          productName: r.productName,
          model: r.model,
          warrantyStartDate: r.warrantyStartDate,
          warrantyEndDate: r.warrantyEndDate,
          remainingDays: r.remainingDays,
          warrantyType: r.warrantyType,
          notes: r.notes,
          sourceUrl: r.sourceUrl,
          responseTimeMs: r.responseTimeMs,
          error: r.error,
        })),
        overallStatus,
        primaryProvider: primaryResult?.providerName,
        warrantyEndDate,
        remainingDays,
        createdBy: data.createdBy || 'Admin',
      });
    } catch (dbErr) {
      console.error('Lỗi lưu lịch sử tra cứu bảo hành vào DB:', dbErr);
    }

    // 5. Return Aggregated Result
    return {
      searchCode,
      sessionId: data.sessionId,
      serialNumber: cleanSerial,
      brand: data.brand,
      model: data.model,
      partNumber: data.partNumber,
      distributor: data.distributor,
      productType: data.productType,
      searchMode: data.searchMode,
      overallStatus,
      primaryResult,
      warrantyEndDate,
      remainingDays,
      providerResults,
      queriedProviderIds: targetProviders.map((p) => p.id),
      totalQueried: targetProviders.length,
      totalFound: activeResults.length + expiredResults.length,
      hasConflicts,
      conflictNotes,
      createdAt: new Date(),
    };
  }

  /**
   * Preview which providers would be queried WITHOUT running the search
   */
  previewProviders(data: {
    searchMode: WarrantySearchMode;
    serialNumber?: string;
    brand?: string;
    distributor?: string;
    productType?: string;
    selectedProviderIds?: string[];
  }) {
    const searchParams: WarrantySearchParams = {
      serialNumber: data.serialNumber || '',
      brand: data.brand?.trim(),
      distributor: data.distributor?.trim(),
      productType: data.productType?.trim(),
    };

    const targetProviders = this.registry.resolveProviders(
      data.searchMode || 'AUTO',
      searchParams,
      data.selectedProviderIds
    );

    const all = this.registry.getAll();
    const targetSet = new Set(targetProviders.map((p) => p.id));
    const notSelected = all.filter((p) => !targetSet.has(p.id));

    return {
      searchMode: data.searchMode,
      estimatedSourcesCount: targetProviders.length,
      selectedSources: targetProviders.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        website: p.website,
      })),
      unselectedSources: notSelected.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
      })),
    };
  }

  /**
   * Get search history
   */
  async getHistory(query: { limit?: number; page?: number; search?: string }) {
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const page = Math.max(1, Number(query.page) || 1);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      const regex = new RegExp(term, 'i');
      filter.$or = [
        { serialNumber: regex },
        { searchCode: regex },
        { brand: regex },
        { model: regex },
        { distributor: regex },
      ];
    }

    const [total, data] = await Promise.all([
      WarrantyCheckHistory.countDocuments(filter),
      WarrantyCheckHistory.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getHistoryById(id: string) {
    const record = await WarrantyCheckHistory.findById(id).lean().exec();
    if (!record) {
      throw new AppError('Không tìm thấy bản ghi lịch sử tra cứu', 404);
    }
    return record;
  }
}
