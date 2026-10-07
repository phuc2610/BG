import { Schema } from 'mongoose';

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

export interface IProductImage {
  url: string;
  publicId: string;
  order: number;
  isThumbnail: boolean;
}

export interface IProductSpecs {
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

// 1. Mã sản phẩm (Master Product Catalog)
export interface IProduct {
  _id?: string;
  productId: string;
  productCode: string;
  barcode: string;
  name: string;
  category: ProductCategory;
  brand: string;
  modelName: string;
  model?: string;
  description?: string;
  specs: IProductSpecs;
  images: IProductImage[];
  createdAt?: Date;
  updatedAt?: Date;
}

// 2. Nhập kho (Inventory Stock Lot)
export interface IInventoryItem {
  _id?: string;
  stockCode: string;
  product: string; // ObjectId reference to IProduct
  productSnapshot?: {
    productCode: string;
    name: string;
    category: ProductCategory;
    brand: string;
    model: string;
    imageUrl?: string;
    specs: IProductSpecs;
  };
  condition: ProductCondition;
  costPrice: number;       // Giá vốn nhập kho
  quantity: number;        // Số lượng tồn kho
  supplier?: string;       // Nhà cung cấp
  supplierWarranty?: string; // Bảo hành từ NCC
  serialNumber?: string;   // Legacy single serial
  serialNumbers: string[]; // Mảng serial cho từng đơn vị
  isSold?: boolean;        // Trạng thái đã bán hay chưa
  soldToCustomer?: ICustomer; // Khách hàng đã mua
  soldQuoteId?: string;    // ID đơn báo giá
  soldQuoteCode?: string;  // Mã báo giá (BG-xxxx)
  soldDate?: Date;         // Ngày xuất bán
  sellingPrice?: number;   // Giá bán ra thực tế
  soldWarranty?: string;   // Thời gian bảo hành xuất bán (12 tháng, 36 tháng...)
  importDate: Date;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export enum CustomerType {
  RETAIL = 'Khách lẻ',
  REGULAR = 'Khách quen',
  VIP = 'VIP',
  ENTERPRISE = 'Doanh nghiệp',
  DEALER = 'Đại lý',
}

export interface ICustomer {
  _id?: string;
  customerCode?: string;
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
  customerType?: CustomerType;
  avatarUrl?: string;
  totalOrders?: number;
  totalRevenue?: number;
  totalPaid?: number;
  totalDebt?: number;
  firstPurchaseDate?: Date;
  lastPurchaseDate?: Date;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICustomerActivity {
  _id?: string;
  customerId: string;
  action: string;
  description: string;
  relatedQuoteId?: string;
  relatedQuoteCode?: string;
  relatedInvoiceId?: string;
  relatedInvoiceCode?: string;
  amount?: number;
  performedBy: string;
  createdAt: Date;
}

export interface IDebt {
  _id?: string;
  invoiceId: string;
  invoiceCode: string;
  quoteCode?: string;
  customerId?: string;
  customer: ICustomer;
  createdDate: Date;
  dueDate: Date;
  grandTotal: number;
  totalPaid: number;
  remainingAmount: number;
  overdueDays: number;
  remainingDays: number;
  debtStatus: 'PAID' | 'UNPAID' | 'PARTIALLY_PAID' | 'DUE_SOON' | 'OVERDUE' | 'CANCELLED';
}

export interface IQuoteItemSnapshot {
  name: string;
  productCode: string;
  brand?: string;
  condition: ProductCondition;
  costPrice: number;      // Giá vốn snapshot
  specs: IProductSpecs;
  imageUrl?: string;
  serialNumber?: string;  // Serial cụ thể đã chọn
}

export interface IQuoteItem {
  inventoryItem: string;  // Ref IInventoryItem
  productSnapshot: IQuoteItemSnapshot;
  unitPrice: number;       // Giá bán ra khi báo giá
  quantity: number;        // Số lượng bán
  discount: number;
  discountType: DiscountType;
  warranty: string;        // Bảo hành khi bán
  serialNumber?: string;   // Serial cụ thể đã chọn khi báo giá
  total: number;
  order: number;
}

export enum InvoiceStatus {
  UNPAID = 'Chưa thanh toán',
  PARTIALLY_PAID = 'Thanh toán một phần',
  PAID = 'Đã thanh toán',
  CANCELLED = 'Đã hủy',
  REFUNDED = 'Hoàn tiền',
  PARTIALLY_RETURNED = 'Trả hàng một phần',
  FULLY_RETURNED = 'Đã trả toàn bộ',
  PARTIALLY_EXCHANGED = 'Đổi hàng một phần',
  EXCHANGED = 'Đã đổi hàng',
}

export enum PaymentMethod {
  CASH = 'Tiền mặt',
  BANK_TRANSFER = 'Chuyển khoản',
  MOMO = 'Momo',
  VNPAY = 'VNPay',
  OTHER = 'Khác',
}

export interface IInvoicePayment {
  _id?: string;
  paymentCode: string;
  amount: number;
  paymentMethod: PaymentMethod;
  bankName?: string;
  referenceCode?: string;
  paymentDate: Date;
  notes?: string;
  createdBy?: string;
  createdAt?: Date;
}

export interface IInvoiceHistory {
  _id?: string;
  action: string;
  description: string;
  performedBy?: string;
  createdAt: Date;
}

export enum InventoryUnitStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  SOLD = 'SOLD',
  WARRANTY = 'WARRANTY',
  RETURNED = 'RETURNED',
  RETURN_INSPECTION = 'RETURN_INSPECTION',
  DAMAGED = 'DAMAGED',
}

export enum ReturnItemCondition {
  GOOD_RESTOCK = 'Tốt / nhập lại kho',
  INSPECTION = 'Chờ kiểm tra',
  WARRANTY = 'Lỗi / bảo hành',
  DAMAGED = 'Hỏng / không nhập kho',
}

export enum ReturnExchangeType {
  RETURN = 'RETURN',
  EXCHANGE = 'EXCHANGE',
}

export interface IReturnItem {
  order: number; // item index in invoice.items
  productId?: string;
  productCode: string;
  productName: string;
  serialNumber?: string;
  originalSalePrice: number;
  originalCostPrice: number;
  refundAmount: number;     // Cash refunded to customer for this item
  debtReduction: number;    // Amount allocated to reduce customer debt
  retainedAmount: number;   // originalSalePrice - refundAmount - debtReduction
  condition: ReturnItemCondition;
  inventoryStatusTarget: InventoryUnitStatus;
  status: 'RETURNED';
}

export interface IExchangeItem {
  order: number; // item index in invoice.items
  oldProductId?: string;
  oldProductCode: string;
  oldProductName: string;
  oldSerialNumber?: string;
  oldSalePrice: number;
  oldCostPrice: number;
  oldCondition: ReturnItemCondition;
  oldInventoryStatusTarget: InventoryUnitStatus;

  newProductId: string;
  newProductCode: string;
  newProductName: string;
  newSerialNumber?: string;
  newSalePrice: number;
  newCostPrice: number;

  priceDifference: number;      // newSalePrice - oldSalePrice
  customerPaidExtra: number;    // Cash/bank transfer paid by customer
  customerDebtAdded: number;    // Extra debt added to customer
  cashRefund: number;           // Cash refunded to customer (if new item cheaper)
  debtReduction: number;        // Debt reduced for customer
  retainedAmount: number;       // Store retained amount from old item
  status: 'EXCHANGED';
}

export interface IReturnExchangeTransaction {
  _id?: string;
  transactionCode: string; // TRA202608060001 or DOI202608060001
  invoiceId: string;
  invoiceCode: string;
  customerId?: string;
  customerName: string;
  type: ReturnExchangeType;
  returnedItems: IReturnItem[];
  exchangedItems: IExchangeItem[];
  totalOriginalValue: number;
  totalRefundAmount: number;
  totalDebtReduction: number;
  totalRetainedAmount: number;
  totalCustomerPaidExtra: number;
  totalCustomerDebtAdded: number;
  profitAdjustment: number;
  reason?: string;
  notes?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}


export interface ISupplier {
  _id?: string;
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
  status?: 'ACTIVE' | 'INACTIVE';
  totalPurchased?: number;
  totalPaid?: number;
  totalDebt?: number;
  purchaseCount?: number;
  lastPurchaseDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISupplierPayment {
  _id?: string;
  paymentCode: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  bankName?: string;
  referenceCode?: string;
  note?: string;
  createdAt?: Date;
}

export interface IPurchaseItem {
  product: string; // Ref IProduct
  productCode: string;
  productName: string;
  quantity: number;
  costPrice: number;
  condition: ProductCondition;
  supplierWarrantyMonths: number;
  serials: string[]; // List of Serial Numbers pasted
  total: number;
}

export interface IPurchase {
  _id?: string;
  purchaseCode: string;
  supplierId: string;
  supplier: {
    name: string;
    companyName?: string;
    phone?: string;
  };
  purchaseDate: Date;
  notes?: string;
  items: IPurchaseItem[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate?: Date;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'DUE_SOON' | 'OVERDUE';
  payments: ISupplierPayment[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IInventoryUnit {
  _id?: string;
  productId: string; // Ref IProduct
  productCode: string;
  productName: string;
  serialNumber: string;
  purchaseId?: string;
  purchaseCode?: string;
  supplierId?: string;
  supplierName?: string;
  purchaseDate: Date;
  purchasePrice: number;
  condition: ProductCondition;
  supplierWarrantyMonths: number;
  supplierWarrantyStartDate: Date;
  supplierWarrantyEndDate: Date;
  status: InventoryUnitStatus;
  reservedByInvoiceId?: string;
  reservedByInvoiceCode?: string;
  soldInvoiceId?: string;
  soldInvoiceCode?: string;
  soldAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IInvoiceItem {
  inventoryItem?: string;
  productId?: string;
  productSnapshot: IQuoteItemSnapshot;
  unitPrice: number;
  quantity: number;
  discount: number;
  discountType: DiscountType;
  warranty: string;
  serialNumber?: string;
  selectedSerials?: string[]; // Mảng các Serial Number được chọn trong Hóa đơn Nháp
  total: number;
  order: number;
  itemStatus?: 'SOLD' | 'RETURNED' | 'EXCHANGED';
  returnExchangeTxId?: string;
  returnedAt?: Date;
  refundAmount?: number;
  retainedAmount?: number;
  debtReduction?: number;
  exchangedToItem?: {
    productId: string;
    productCode: string;
    productName: string;
    serialNumber?: string;
    unitPrice: number;
    costPrice: number;
  };
}


export interface IQuote {
  _id?: string;
  quoteCode: string;
  invoiceId?: string;
  invoiceCode?: string;
  customerId?: string;
  createdDate: Date;
  createdBy: string;
  customer: ICustomer;
  items: IQuoteItem[];
  subtotal: number;
  discount: number;
  discountType: DiscountType;
  shippingFee: number;
  vatEnabled: boolean;
  vatPercent: number;
  vatAmount: number;
  grandTotal: number;      // Tổng giá bán ra
  totalCost: number;       // Tổng giá vốn nhập
  profit: number;          // Tiền lời (grandTotal - totalCost)
  status: QuoteStatus;
  showConditionInPdf?: boolean;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IInvoice {
  _id?: string;
  invoiceCode: string;
  quoteId?: string;
  quoteCode?: string;
  customerId?: string;
  createdDate: Date;
  createdBy?: string;
  updatedBy?: string;
  customer: ICustomer;
  items: IInvoiceItem[];
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
  dueDate?: Date;
  status: InvoiceStatus;
  isDraft?: boolean;
  isFinalized?: boolean;
  finalizedAt?: Date;
  payments: IInvoicePayment[];
  history: IInvoiceHistory[];
  notes?: string;
  showConditionInPdf?: boolean;
  eInvoiceStatus?: 'draft' | 'issued' | 'failed';
  eInvoiceProvider?: string;
  eInvoiceRef?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IBenefitItem {
  id: string;
  enabled: boolean;
  title: string;
  description: string;
  sortOrder: number;
}

export interface ISettings {
  storeName: string;
  tagline?: string;
  hotline: string;
  website?: string;
  facebook?: string;
  address: string;
  email?: string;
  logoUrl?: string;
  logoPublicId?: string;
  qrPaymentUrl?: string;
  qrPaymentPublicId?: string;
  signatureUrl?: string;
  signaturePublicId?: string;
  stampUrl?: string;
  stampPublicId?: string;
  thankYouAssetUrl?: string;
  thankYouAssetPublicId?: string;
  signerName?: string;
  signerTitle?: string;
  bankInfo?: string;
  terms: string[];
  benefits?: IBenefitItem[];
  footerText: string;
  quoteValidityDays?: number;
  quoteNotes?: string[];
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface ProductFilterQuery extends PaginationQuery {
  category?: ProductCategory;
  brand?: string;
  noImage?: boolean;
}

export interface InventoryFilterQuery extends PaginationQuery {
  category?: ProductCategory;
  condition?: ProductCondition;
  product?: string;
  inStockOnly?: boolean;
  statusFilter?: 'all' | 'in_stock' | 'sold';
  warrantyStatus?: 'all' | 'valid' | 'due_soon' | 'expired';
}

export interface SupplierFilterQuery extends PaginationQuery {
  status?: 'ACTIVE' | 'INACTIVE';
  hasDebtOnly?: boolean;
}

export interface PurchaseFilterQuery extends PaginationQuery {
  supplierId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface InventoryUnitFilterQuery extends PaginationQuery {
  productId?: string;
  supplierId?: string;
  status?: InventoryUnitStatus;
  warrantyFilter?: 'all' | 'valid' | 'due_soon' | 'expired';
}

export interface QuoteFilterQuery extends PaginationQuery {
  status?: QuoteStatus;
  startDate?: string;
  endDate?: string;
  customerId?: string;
}

export interface InvoiceFilterQuery extends PaginationQuery {
  status?: InvoiceStatus;
  isDraft?: boolean;
  isFinalized?: boolean;
  startDate?: string;
  endDate?: string;
  customerId?: string;
}

export interface CustomerFilterQuery extends PaginationQuery {
  customerType?: CustomerType;
  hasDebtOnly?: boolean;
  isOverdueOnly?: boolean;
}

export interface DebtFilterQuery extends PaginationQuery {
  debtStatus?: 'all' | 'has_debt' | 'due_soon' | 'overdue' | 'paid';
  customerId?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardStats {
  totalProducts: number;
  totalInventoryItems: number;
  totalStockQuantity: number;
  totalRevenue: number;   // Doanh thu từ đơn đã chốt
  totalCost: number;      // Giá vốn từ đơn đã chốt
  totalProfit: number;    // Tiền lời
  profitMargin?: number;
  byCategory: Record<string, number>;
  byCondition: Record<string, number>;
  recentInventory: IInventoryItem[];
}


export interface InvoiceStats {
  totalRevenue: number;
  totalPaid: number;
  totalReceivables: number;
  totalInvoices: number;
  totalProfit: number;
  averageInvoiceValue: number;
}

export interface CustomerStats {
  totalCustomers: number;
  totalRevenue: number;
  totalPaid: number;
  totalDebt: number;
  totalProfit: number;
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
  currentStockValuation: number; // Tổng giá trị hàng còn kho tính theo giá nhập
}

