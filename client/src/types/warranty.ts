export type WarrantyWorkflowState =
  | 'IDLE'
  | 'UPLOADING'
  | 'OCR_PROCESSING'
  | 'OCR_COMPLETED'
  | 'REVIEWING'
  | 'READY_TO_SEARCH'
  | 'SEARCHING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED';

export type WarrantySearchMode =
  | 'AUTO'
  | 'MANUFACTURER'
  | 'DISTRIBUTOR'
  | 'MANUFACTURER_DISTRIBUTOR'
  | 'SELECTED'
  | 'ALL';

export interface OcrFields {
  brand?: string;
  productName?: string;
  model?: string;
  serialNumber?: string;
  partNumber?: string;
  distributor?: string;
  productType?: string;
  confidence?: number;
  rawText?: string;
}

export interface ProviderItem {
  id: string;
  name: string;
  type: 'MANUFACTURER' | 'DISTRIBUTOR';
  website?: string;
  lookupUrl?: string;
  supportedBrands?: string[];
  supportedProductTypes?: string[];
}

export interface ProviderResult {
  providerId: string;
  providerName: string;
  providerType: 'MANUFACTURER' | 'DISTRIBUTOR';
  status: 'ACTIVE' | 'EXPIRED' | 'NOT_FOUND' | 'ERROR' | 'UNKNOWN';
  serialNumber: string;
  productName?: string;
  model?: string;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  remainingDays?: number;
  warrantyType?: string;
  notes?: string;
  sourceUrl?: string;
  responseTimeMs: number;
  error?: string;
}

export interface AggregatedResult {
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
  primaryResult?: ProviderResult;
  warrantyEndDate?: string;
  remainingDays?: number;
  providerResults: ProviderResult[];
  queriedProviderIds: string[];
  totalQueried: number;
  totalFound: number;
  hasConflicts: boolean;
  conflictNotes?: string;
  createdAt: string;
}

export interface SearchPreviewInfo {
  searchMode: WarrantySearchMode;
  estimatedSourcesCount: number;
  selectedSources: Array<{ id: string; name: string; type: string; website?: string }>;
  unselectedSources: Array<{ id: string; name: string; type: string }>;
}

export const HARDWARE_MANUFACTURERS = [
  'ASUS',
  'GIGABYTE',
  'Acer',
  'Lenovo',
  'Dell',
  'ASRock',
  'Seagate',
  'Western Digital',
  'Kingston',
  'MSI',
  'Corsair',
  'HP',
  'Intel',
  'AMD',
  'Samsung',
];

export const VIETNAM_DISTRIBUTORS = [
  'Mai Hoàng',
  'Digiworld',
  'VSP',
  'Synnex FPT',
  'Viễn Sơn',
  'Thủy Linh',
  'Vĩnh Xuân (SPC)',
  'Viết Sơn',
  'Vinago',
  'Linaco',
  'DTR',
  'Sintech',
  'Tân Phát',
  'Song Hùng',
  'DSG',
];

export const HARDWARE_PRODUCT_TYPES = [
  'VGA',
  'Mainboard',
  'CPU',
  'RAM',
  'SSD',
  'HDD',
  'PSU',
  'Case',
  'Màn hình',
  'Laptop',
  'Tản nhiệt',
  'Phụ kiện',
  'Khác',
];
