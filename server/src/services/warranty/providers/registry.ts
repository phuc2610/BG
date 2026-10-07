import { IWarrantyProvider, WarrantySearchMode, WarrantySearchParams } from '../types';
import {
  AsusProvider,
  GigabyteProvider,
  AcerProvider,
  LenovoProvider,
  DellProvider,
  AsrockProvider,
  SeagateProvider,
  WesternDigitalProvider,
  KingstonProvider,
} from './manufacturers';
import {
  MaiHoangProvider,
  DigiworldProvider,
  VspProvider,
  SynnexFptProvider,
  VienSonProvider,
  ThuyLinhProvider,
  VinhXuanProvider,
  VietSonProvider,
  VinagoProvider,
  LinacoProvider,
  DtrProvider,
  SintechProvider,
  TanPhatProvider,
  SongHungProvider,
  DsgProvider,
} from './distributors';

export class WarrantyProviderRegistry {
  private static instance: WarrantyProviderRegistry;
  private providers: Map<string, IWarrantyProvider> = new Map();

  private constructor() {
    this.registerDefaults();
  }

  public static getInstance(): WarrantyProviderRegistry {
    if (!WarrantyProviderRegistry.instance) {
      WarrantyProviderRegistry.instance = new WarrantyProviderRegistry();
    }
    return WarrantyProviderRegistry.instance;
  }

  private registerDefaults() {
    // 9 Manufacturers
    this.register(new AsusProvider());
    this.register(new GigabyteProvider());
    this.register(new AcerProvider());
    this.register(new LenovoProvider());
    this.register(new DellProvider());
    this.register(new AsrockProvider());
    this.register(new SeagateProvider());
    this.register(new WesternDigitalProvider());
    this.register(new KingstonProvider());

    // 15 Distributors
    this.register(new MaiHoangProvider());
    this.register(new DigiworldProvider());
    this.register(new VspProvider());
    this.register(new SynnexFptProvider());
    this.register(new VienSonProvider());
    this.register(new ThuyLinhProvider());
    this.register(new VinhXuanProvider());
    this.register(new VietSonProvider());
    this.register(new VinagoProvider());
    this.register(new LinacoProvider());
    this.register(new DtrProvider());
    this.register(new SintechProvider());
    this.register(new TanPhatProvider());
    this.register(new SongHungProvider());
    this.register(new DsgProvider());
  }

  public register(provider: IWarrantyProvider) {
    this.providers.set(provider.id, provider);
  }

  public get(id: string): IWarrantyProvider | undefined {
    return this.providers.get(id);
  }

  public getAll(): IWarrantyProvider[] {
    return Array.from(this.providers.values());
  }

  public getAvailableProvidersList() {
    return this.getAll().map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      website: p.website,
      lookupUrl: p.lookupUrl,
      supportedBrands: p.supportedBrands,
      supportedProductTypes: p.supportedProductTypes,
    }));
  }

  /**
   * Resolves which providers should be queried based on search mode and parameters.
   */
  public resolveProviders(
    mode: WarrantySearchMode,
    params: WarrantySearchParams,
    selectedProviderIds?: string[]
  ): IWarrantyProvider[] {
    const all = this.getAll();

    switch (mode) {
      case 'SELECTED': {
        if (!selectedProviderIds || selectedProviderIds.length === 0) {
          return [];
        }
        return selectedProviderIds
          .map((id) => this.providers.get(id))
          .filter((p): p is IWarrantyProvider => Boolean(p));
      }

      case 'MANUFACTURER': {
        // Chỉ các provider thuộc type MANUFACTURER
        const mfgProviders = all.filter((p) => p.type === 'MANUFACTURER');
        if (params.brand && params.brand.trim()) {
          const compatible = mfgProviders.filter((p) => p.isCompatible(params));
          return compatible.length > 0 ? compatible : mfgProviders;
        }
        return mfgProviders;
      }

      case 'DISTRIBUTOR': {
        // Chỉ các provider thuộc type DISTRIBUTOR
        const distProviders = all.filter((p) => p.type === 'DISTRIBUTOR');
        if (params.distributor && params.distributor.trim()) {
          const compatible = distProviders.filter((p) => p.isCompatible(params));
          return compatible.length > 0 ? compatible : distProviders;
        }
        return distProviders;
      }

      case 'MANUFACTURER_DISTRIBUTOR': {
        // Kết hợp cả Hãng và Nhà Phân Phối tương thích nhất
        const selectedMfg = all
          .filter((p) => p.type === 'MANUFACTURER')
          .filter((p) => (params.brand ? p.isCompatible(params) : true));

        const selectedDist = all
          .filter((p) => p.type === 'DISTRIBUTOR')
          .filter((p) => (params.distributor ? p.isCompatible(params) : true));

        return [...selectedMfg, ...selectedDist];
      }

      case 'ALL': {
        // Tất cả providers đã cấu hình
        return all;
      }

      case 'AUTO':
      default: {
        // Tự động phân tích Brand, Distributor, ProductType để chọn các nguồn liên quan nhất
        const matchedMfg = all
          .filter((p) => p.type === 'MANUFACTURER')
          .filter((p) => p.isCompatible(params));

        const matchedDist = all
          .filter((p) => p.type === 'DISTRIBUTOR')
          .filter((p) => p.isCompatible(params));

        const combined = [...matchedMfg, ...matchedDist];

        // Khi chỉ nhập mỗi Serial (không chọn Hãng/NPP cụ thể):
        // Tra cứu toàn bộ các nguồn Hãng & NPP để tìm chính xác nhất!
        if (combined.length === 0 || (!params.brand && !params.distributor)) {
          return all;
        }

        return combined;
      }
    }
  }
}
