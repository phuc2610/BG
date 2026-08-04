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

export interface BenefitItem {
  id: string;
  enabled: boolean;
  title: string;
  description: string;
  sortOrder: number;
}

export interface Settings {
  _id: string;
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
  benefits?: BenefitItem[];
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
  remainingDays: number;
  debtStatus: 'PAID' | 'UNPAID' | 'PARTIALLY_PAID' | 'DUE_SOON' | 'OVERDUE' | 'CANCELLED';
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

export interface UserAccount {
  _id: string;
  id?: string;
  username: string;
  role: 'ADMIN' | 'USER';
  status: 'PENDING' | 'ACTIVE' | 'BLOCKED';
  isActive: boolean;
  permissions: string[];
  maxQuoteDiscountPercent?: number;
  registeredAt?: string;
  activatedAt?: string;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PermissionGroup {
  id: string;
  title: string;
  permissions: {
    key: string;
    label: string;
  }[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'dashboard',
    title: 'DASHBOARD',
    permissions: [
      { key: 'dashboard.view', label: 'Xem Dashboard' },
      { key: 'dashboard.revenue', label: 'Xem doanh thu' },
      { key: 'dashboard.profit', label: 'Xem lợi nhuận' },
      { key: 'dashboard.inventory_value', label: 'Xem giá trị tồn kho' },
      { key: 'dashboard.purchase_total', label: 'Xem tổng tiền nhập hàng' },
      { key: 'dashboard.supplier_debt', label: 'Xem công nợ NCC' },
      { key: 'dashboard.customer_debt', label: 'Xem công nợ khách hàng' },
    ],
  },
  {
    id: 'product_inventory',
    title: 'SẢN PHẨM & KHO',
    permissions: [
      { key: 'product.view', label: 'Xem sản phẩm' },
      { key: 'inventory.view', label: 'Xem tồn kho' },
      { key: 'inventory.serial.view', label: 'Xem Serial' },
      { key: 'inventory.condition.view', label: 'Xem tình trạng Serial' },
      { key: 'product.sale_price.view', label: 'Xem giá bán' },
      { key: 'inventory.cost.view', label: 'Xem giá nhập' },
      { key: 'inventory.supplier.view', label: 'Xem NCC của Serial' },
      { key: 'inventory.supplier_warranty.view', label: 'Xem bảo hành NCC' },
      { key: 'product.create', label: 'Thêm sản phẩm' },
      { key: 'product.edit', label: 'Sửa sản phẩm' },
      { key: 'product.delete', label: 'Xóa sản phẩm' },
      { key: 'inventory.adjust', label: 'Điều chỉnh tồn kho' },
    ],
  },
  {
    id: 'purchase',
    title: 'NHẬP HÀNG',
    permissions: [
      { key: 'purchase.view', label: 'Xem phiếu nhập' },
      { key: 'purchase.create', label: 'Tạo phiếu nhập' },
      { key: 'purchase.edit', label: 'Sửa phiếu nhập' },
      { key: 'purchase.delete', label: 'Xóa phiếu nhập' },
      { key: 'purchase.cost.view', label: 'Xem giá nhập' },
      { key: 'purchase.total.view', label: 'Xem tổng tiền nhập' },
      { key: 'purchase.paid.view', label: 'Xem tiền đã trả NCC' },
      { key: 'purchase.debt.view', label: 'Xem công nợ phiếu nhập' },
      { key: 'purchase.payment.create', label: 'Thanh toán NCC' },
    ],
  },
  {
    id: 'supplier',
    title: 'NHÀ CUNG CẤP',
    permissions: [
      { key: 'supplier.view', label: 'Xem NCC' },
      { key: 'supplier.create', label: 'Thêm NCC' },
      { key: 'supplier.edit', label: 'Sửa NCC' },
      { key: 'supplier.delete', label: 'Xóa NCC' },
      { key: 'supplier.purchase_history.view', label: 'Xem lịch sử nhập từ NCC' },
      { key: 'supplier.purchase_total.view', label: 'Xem tổng tiền nhập từ NCC' },
      { key: 'supplier.debt.view', label: 'Xem công nợ NCC' },
      { key: 'supplier.payment.create', label: 'Ghi nhận thanh toán NCC' },
    ],
  },
  {
    id: 'customer',
    title: 'KHÁCH HÀNG',
    permissions: [
      { key: 'customer.view', label: 'Xem khách hàng' },
      { key: 'customer.create', label: 'Thêm khách hàng' },
      { key: 'customer.edit', label: 'Sửa khách hàng' },
      { key: 'customer.delete', label: 'Xóa khách hàng' },
      { key: 'customer.purchase_history.view', label: 'Xem lịch sử mua hàng' },
      { key: 'customer.debt.view', label: 'Xem công nợ khách' },
      { key: 'customer.payment_history.view', label: 'Xem lịch sử thanh toán' },
    ],
  },
  {
    id: 'quote',
    title: 'BÁO GIÁ',
    permissions: [
      { key: 'quote.view', label: 'Xem báo giá' },
      { key: 'quote.create', label: 'Tạo báo giá' },
      { key: 'quote.edit', label: 'Sửa báo giá' },
      { key: 'quote.delete', label: 'Xóa báo giá' },
      { key: 'quote.send', label: 'Gửi báo giá' },
      { key: 'quote.finalize', label: 'Chốt báo giá' },
      { key: 'quote.export_pdf', label: 'Xuất PDF' },
      { key: 'quote.change_price', label: 'Chỉnh giá bán trên báo giá' },
      { key: 'quote.discount', label: 'Giảm giá' },
    ],
  },
  {
    id: 'invoice',
    title: 'HÓA ĐƠN',
    permissions: [
      { key: 'invoice.view', label: 'Xem hóa đơn' },
      { key: 'invoice.create', label: 'Tạo hóa đơn' },
      { key: 'invoice.edit', label: 'Sửa hóa đơn nháp' },
      { key: 'invoice.delete_draft', label: 'Xóa hóa đơn nháp' },
      { key: 'invoice.serial.select', label: 'Chọn Serial' },
      { key: 'invoice.serial.change', label: 'Đổi Serial' },
      { key: 'invoice.finalize', label: 'Chốt hóa đơn' },
      { key: 'invoice.cancel', label: 'Hủy hóa đơn' },
      { key: 'invoice.export_pdf', label: 'Xuất PDF hóa đơn' },
    ],
  },
  {
    id: 'payment_debt',
    title: 'THANH TOÁN / CÔNG NỢ KHÁCH',
    permissions: [
      { key: 'payment.view', label: 'Xem số tiền khách đã thanh toán' },
      { key: 'customer.debt.view', label: 'Xem công nợ khách' },
      { key: 'customer.debt_due_date.view', label: 'Xem hạn thanh toán' },
      { key: 'payment.create', label: 'Ghi nhận thanh toán' },
      { key: 'customer.debt_due_date.edit', label: 'Sửa hạn công nợ' },
    ],
  },
  {
    id: 'warranty',
    title: 'BẢO HÀNH',
    permissions: [
      { key: 'warranty.customer.view', label: 'Xem bảo hành khách hàng' },
      { key: 'warranty.supplier.view', label: 'Xem bảo hành NCC' },
      { key: 'warranty.supplier_expiry.view', label: 'Xem ngày hết BH NCC' },
      { key: 'warranty.supplier_remaining.view', label: 'Xem số ngày BH NCC còn lại' },
    ],
  },
  {
    id: 'settings',
    title: 'CÀI ĐẶT',
    permissions: [
      { key: 'settings.view', label: 'Xem cài đặt' },
      { key: 'settings.store.edit', label: 'Sửa thông tin cửa hàng' },
      { key: 'settings.quote_template.edit', label: 'Sửa mẫu báo giá' },
      { key: 'settings.invoice_template.edit', label: 'Sửa mẫu hóa đơn' },
      { key: 'settings.payment.edit', label: 'Sửa thông tin thanh toán / QR' },
    ],
  },
];

export const SALES_CTV_PRESET_PERMISSIONS = [
  'dashboard.view',
  'product.view',
  'inventory.view',
  'product.sale_price.view',
  'customer.view',
  'customer.create',
  'quote.view',
  'quote.create',
  'quote.edit',
  'quote.send',
  'quote.export_pdf',
  'quote.change_price',
  'quote.discount',
];

export const MANAGER_PRESET_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));

