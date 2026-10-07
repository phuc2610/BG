export type WarrantyProviderType = 'MANUFACTURER' | 'DISTRIBUTOR';

export type WarrantySearchStatus =
  | 'ACTIVE'      // Còn bảo hành
  | 'EXPIRED'     // Hết hạn bảo hành
  | 'NOT_FOUND'   // Không tìm thấy serial trong hệ thống
  | 'ERROR'       // Lỗi kết nối / timeout / captcha
  | 'UNKNOWN';    // Không xác định

export interface WarrantySearchParams {
  serialNumber: string;
  brand?: string;
  model?: string;
  partNumber?: string;
  distributor?: string;
  productType?: string;
}

export interface ProviderSearchResult {
  providerId: string;
  providerName: string;
  providerType: WarrantyProviderType;
  status: WarrantySearchStatus;
  serialNumber: string;
  productName?: string;
  model?: string;
  warrantyStartDate?: Date;
  warrantyEndDate?: Date;
  remainingDays?: number;
  warrantyType?: string;
  notes?: string;
  sourceUrl?: string;
  responseTimeMs: number;
  error?: string;
  rawResponse?: any;
}

export interface IWarrantyProvider {
  id: string;
  name: string;
  type: WarrantyProviderType;
  logo?: string;
  website?: string;
  lookupUrl?: string;
  supportedBrands: string[];
  supportedProductTypes?: string[];

  isCompatible(query: { brand?: string; distributor?: string; productType?: string }): boolean;
  search(params: WarrantySearchParams): Promise<ProviderSearchResult>;
}

export type WarrantySearchMode =
  | 'AUTO'
  | 'MANUFACTURER'
  | 'DISTRIBUTOR'
  | 'MANUFACTURER_DISTRIBUTOR'
  | 'SELECTED'
  | 'ALL';

export interface OcrExtractedFields {
  brand?: string;
  model?: string;
  productName?: string;
  serialNumber?: string;
  partNumber?: string;
  distributor?: string;
  productType?: string;
  confidence?: number;
  rawText?: string;
}

export interface OcrResultDto {
  sessionId: string;
  imageUrl?: string;
  fields: OcrExtractedFields;
  confidence: number;
  message: string;
}

export interface AggregatedWarrantyResult {
  searchCode: string;
  sessionId?: string;
  serialNumber: string;
  brand?: string;
  model?: string;
  partNumber?: string;
  distributor?: string;
  productType?: string;
  searchMode: WarrantySearchMode;
  overallStatus: 'ACTIVE' | 'EXPIRED' | 'NOT_FOUND' | 'PARTIAL' | 'ERROR';
  primaryResult?: ProviderSearchResult;
  warrantyEndDate?: Date;
  remainingDays?: number;
  providerResults: ProviderSearchResult[];
  queriedProviderIds: string[];
  totalQueried: number;
  totalFound: number;
  hasConflicts: boolean;
  conflictNotes?: string;
  createdAt: Date;
}
