// ============================================
// Enums
// ============================================

export enum ProductCategory {
  CPU = 'CPU',
  RAM = 'RAM',
  SSD = 'SSD',
  HDD = 'HDD',
  VGA = 'VGA',
  MAINBOARD = 'Mainboard',
  PSU = 'PSU',
  CASE = 'Case',
  MONITOR = 'Màn hình',
  COOLER = 'Tản nhiệt',
  ACCESSORY = 'Phụ kiện',
  LAPTOP = 'Laptop',
  PC = 'PC Nguyên bộ',
}

export enum ProductCondition {
  NEW = 'New',
  LIKE_NEW = 'Like New',
  NINETY_NINE = '99%',
  NINETY_FIVE = '95%',
  USED = 'Cũ',
}

export enum CustomerType {
  RETAIL = 'Khách lẻ',
  REGULAR = 'Khách quen',
  VIP = 'VIP',
  ENTERPRISE = 'Doanh nghiệp',
  DEALER = 'Đại lý',
}

export enum QuoteStatus {
  DRAFT = 'Nháp',
  SENT = 'Đã gửi',
  CONFIRMED = 'Đã chốt',
  CANCELLED = 'Đã hủy',
}

export enum DiscountType {
  PERCENT = 'percent',
  FIXED = 'fixed',
}

export const WARRANTY_OPTIONS = [
  'Bao test lấy',
  '7 ngày (1 tuần)',
  '1 tháng',
  '3 tháng',
  '6 tháng',
  '12 tháng',
  '24 tháng',
  '36 tháng',
];

// ============================================
// Interfaces
// ============================================

export interface ProductImage {
  _id: string;
  url: string;
  publicId: string;
  order: number;
  isThumbnail: boolean;
}

export interface ProductSpecs {
  cpu?: string;
  mainboard?: string;
  ram?: string;
  ssd?: string;
  hdd?: string;
  vga?: string;
  psu?: string;
  case?: string;
  cooler?: string;
  windows?: string;
  office?: string;
  accessories?: string;
  notes?: string;
}

// 1. Mã sản phẩm Master (Ảnh, Tên, Thương hiệu, Model, Specs, Mô tả)
export interface Product {
  _id: string;
  productId: string;
  productCode: string;
  barcode: string;
  name: string;
  category: ProductCategory;
  brand: string;
  model: string;
  description?: string;
  specs: ProductSpecs;
  images: ProductImage[];
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// 2. Nhập kho (Chọn Mã SP, Tình trạng, Giá vốn, Số lượng nhập, Serial Number)
export interface InventoryItem {
  _id: string;
  stockCode: string;
  product: Product;
  condition: ProductCondition;
  costPrice: number;        // Giá vốn nhập kho
  quantity: number;         // Số lượng tồn kho
  supplier?: string;        // Nhà cung cấp
  supplierWarranty?: string; // Bảo hành từ NCC
  serialNumber?: string;
  serialNumbers: string[];  // Mảng serial cho từng đơn vị
  isSold?: boolean;         // Trạng thái đã bán hay chưa
  soldToCustomer?: Customer; // Thông tin khách hàng đã mua
  soldQuoteId?: string;     // ID đơn báo giá
  soldQuoteCode?: string;   // Mã báo giá (BG-xxxx)
  soldDate?: string;        // Ngày xuất bán
  sellingPrice?: number;    // Giá bán thực tế
  soldWarranty?: string;    // Bảo hành khi xuất bán (12 tháng, 36 tháng...)
  importDate: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface QuoteItemSnapshot {
  name: string;
  productCode: string;
  condition: ProductCondition;
  costPrice: number;       // Giá vốn snapshot
  specs: ProductSpecs;
  imageUrl?: string;
  serialNumber?: string;   // Serial cụ thể đã chọn
}

export interface QuoteItem {
  _id: string;
  inventoryItem: string;
  productSnapshot: QuoteItemSnapshot;
  unitPrice: number;        // Giá bán ra khi báo giá
  quantity: number;         // Số lượng bán
  discount: number;
  discountType: DiscountType;
  warranty: string;         // Bảo hành chọn khi bán
  serialNumber?: string;    // Serial cụ thể đã chọn
  total: number;
  order: number;
}

export enum InvoiceStatus {
  UNPAID = 'Chưa thanh toán',
  PARTIALLY_PAID = 'Thanh toán một phần',
  PAID = 'Đã thanh toán',
  CANCELLED = 'Đã hủy',
  REFUNDED = 'Hoàn tiền',
}

export enum PaymentMethod {
  CASH = 'Tiền mặt',
  BANK_TRANSFER = 'Chuyển khoản',
  MOMO = 'Momo',
  VNPAY = 'VNPay',
  OTHER = 'Khác',
}

export interface InvoicePayment {
  _id?: string;
  paymentCode: string;
  amount: number;
  paymentMethod: PaymentMethod;
  bankName?: string;
  referenceCode?: string;
  paymentDate: string;
  notes?: string;
  createdBy: string;
  createdAt?: string;
}

export interface InvoiceHistory {
  _id?: string;
  action: string;
  description: string;
  performedBy: string;
  createdAt: string;
}

export interface InvoiceItem {
  inventoryItem?: string;
  productId?: string;
  productSnapshot: QuoteItemSnapshot;
  unitPrice: number;
  quantity: number;
  discount: number;
  discountType: DiscountType;
  warranty: string;
  serialNumber?: string;
  selectedSerials?: string[];
  total: number;
  order: number;
}

export interface Quote {
  _id: string;
  quoteCode: string;
  invoiceId?: string;
  invoiceCode?: string;
  createdDate: string;
  createdBy: string;
  customer: Customer;
  items: QuoteItem[];
  subtotal: number;
  discount: number;
  discountType: DiscountType;
  shippingFee: number;
  vatEnabled: boolean;
  vatPercent: number;
  vatAmount: number;
  grandTotal: number;       // Tổng giá bán ra
  totalCost: number;        // Tổng giá vốn
  profit: number;           // Tiền lời (grandTotal - totalCost)
  status: QuoteStatus;
  showConditionInPdf?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  _id: string;
  invoiceCode: string;
  quoteId?: string;
  quoteCode?: string;
  customerId?: string;
  createdDate: string;
  createdBy?: string;
  updatedBy?: string;
  customer: Customer;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  discountType: DiscountType;
  shippingFee: number;
  vatEnabled: boolean;
  vatPercent: number;
  vatAmount: number;
  grandTotal: number;
  totalCost: number;
  profit: number;
  totalPaid: number;
  remainingAmount: number;
  dueDate?: string;
  status: InvoiceStatus;
  isDraft?: boolean;
  isFinalized?: boolean;
  finalizedAt?: string;
  payments: InvoicePayment[];
  history: InvoiceHistory[];
  notes?: string;
  showConditionInPdf?: boolean;
  eInvoiceStatus?: 'draft' | 'issued' | 'failed';
  eInvoiceProvider?: string;
  eInvoiceRef?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceStats {
  totalRevenue: number;
  totalPaid: number;
  totalReceivables: number;
  totalInvoices: number;
  averageInvoiceValue: number;
}

export interface Settings {
  _id: string;
  storeName: string;
  hotline: string;
  website?: string;
  facebook?: string;
  address: string;
  email?: string;
  logoUrl?: string;
  qrPaymentUrl?: string;
  bankInfo?: string;
  terms: string[];
  footerText: string;
}

export interface DashboardStats {
  totalProducts: number;
  totalInventoryItems: number;
  totalStockQuantity: number;
  totalRevenue: number;
  totalCost: number;
  totalStockValuation: number;
  totalProfit: number;
  totalCustomerDebt: number;
  totalSupplierDebt: number;
  totalFinalizedInvoices: number;
  totalInStockCount: number;
  byCategory: Record<string, number>;
  byCondition: Record<string, number>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CustomerRecord {
  _id: string;
  customerCode: string;
  name: string;
  companyName?: string;
  contactPerson?: string;
  phone?: string;
  secondaryPhone?: string;
  email?: string;
  facebook?: string;
  zalo?: string;
  address?: string;
  taxCode?: string;
  notes?: string;
  customerType: CustomerType;
  avatarUrl?: string;
  totalOrders: number;
  totalRevenue: number;
  totalPaid: number;
  totalDebt: number;
  firstPurchaseDate?: string;
  lastPurchaseDate?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerActivity {
  _id: string;
  customerId: string;
  action: string;
  description: string;
  relatedQuoteId?: string;
  relatedQuoteCode?: string;
  relatedInvoiceId?: string;
  relatedInvoiceCode?: string;
  amount?: number;
  performedBy: string;
  createdAt: string;
}

export interface DebtRecord {
  _id: string;
  invoiceId: string;
  invoiceCode: string;
  quoteCode?: string;
  customerId?: string;
  customer: Customer;
  createdDate: string;
  dueDate: string;
  grandTotal: number;
  totalPaid: number;
  remainingAmount: number;
  overdueDays: number;
  debtStatus: 'PAID' | 'UNPAID' | 'PARTIALLY_PAID' | 'DUE_SOON' | 'OVERDUE' | 'CANCELLED';
}

export interface CustomerStats {
  totalCustomers: number;
  newThisMonth: number;
  totalVip: number;
  totalEnterprise: number;
  customersWithDebt: number;
  overdueCustomers: number;
}

export interface DebtStats {
  totalDebt: number;
  totalCollected: number;
  totalOutstanding: number;
  totalOverdue: number;
  topDebtor?: {
    name: string;
    phone?: string;
    amount: number;
  };
  monthlyRevenue: number;
}

export enum InventoryUnitStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  SOLD = 'SOLD',
  WARRANTY = 'WARRANTY',
  RETURNED = 'RETURNED',
  DAMAGED = 'DAMAGED',
}

export interface SupplierRecord {
  _id: string;
  supplierCode: string;
  name: string;
  companyName?: string;
  phone?: string;
  zalo?: string;
  email?: string;
  address?: string;
  taxCode?: string;
  accountNumber?: string;
  bankName?: string;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE';
  totalPurchased: number;
  totalPaid: number;
  totalDebt: number;
  purchaseCount: number;
  lastPurchaseDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierPaymentRecord {
  _id?: string;
  paymentCode: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  bankName?: string;
  referenceCode?: string;
  note?: string;
  purchaseCode?: string;
  purchaseId?: string;
  createdAt?: string;
}

export interface PurchaseItemRecord {
  product: string;
  productCode: string;
  productName: string;
  quantity: number;
  costPrice: number;
  condition: ProductCondition;
  supplierWarrantyMonths: number;
  serials: string[];
  total: number;
}

export interface PurchaseRecord {
  _id: string;
  purchaseCode: string;
  supplierId: string;
  supplier: {
    name: string;
    companyName?: string;
    phone?: string;
  };
  purchaseDate: string;
  notes?: string;
  items: PurchaseItemRecord[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate?: string;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'DUE_SOON' | 'OVERDUE';
  payments: SupplierPaymentRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface InventoryUnitRecord {
  _id: string;
  productId: string;
  productCode: string;
  productName: string;
  serialNumber: string;
  purchaseId?: string;
  purchaseCode?: string;
  supplierId?: string;
  supplierName?: string;
  purchaseDate: string;
  purchasePrice: number;
  condition: ProductCondition;
  supplierWarrantyMonths: number;
  supplierWarrantyStartDate: string;
  supplierWarrantyEndDate: string;
  remainingWarrantyDays?: number;
  warrantyStatus?: 'NORMAL' | 'DUE_SOON' | 'EXPIRED';
  status: InventoryUnitStatus;
  reservedByInvoiceId?: string;
  reservedByInvoiceCode?: string;
  soldInvoiceId?: string;
  soldInvoiceCode?: string;
  soldAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryGroupedProduct {
  productId: string;
  productCode: string;
  productName: string;
  category: ProductCategory;
  brand: string;
  imageUrl?: string;
  availableStock: number;
  reservedStock: number;
  soldStock: number;
  totalStock: number;
  latestCostPrice: number;
  totalStockValue: number;
}

export interface SupplierStats {
  totalSuppliers: number;
  totalPurchased: number;
  totalPaid: number;
  totalDebt: number;
  overdueDebt: number;
}

export interface PurchaseStats {
  totalPurchasesAmount: number;
  totalPaidSuppliers: number;
  totalRemainingDebt: number;
  totalOverdueDebt: number;
  currentStockValuation: number;
}

export type ViewMode = 'grid' | 'list';
