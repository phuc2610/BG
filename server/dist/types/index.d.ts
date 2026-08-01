export declare enum ProductCategory {
    CPU = "CPU",
    RAM = "RAM",
    SSD = "SSD",
    HDD = "HDD",
    VGA = "VGA",
    MAINBOARD = "Mainboard",
    PSU = "PSU",
    CASE = "Case",
    MONITOR = "M\u00E0n h\u00ECnh",
    COOLER = "T\u1EA3n nhi\u1EC7t",
    ACCESSORY = "Ph\u1EE5 ki\u1EC7n",
    LAPTOP = "Laptop",
    PC = "PC Nguy\u00EAn b\u1ED9"
}
export declare enum ProductCondition {
    NEW = "New",
    LIKE_NEW = "Like New",
    NINETY_NINE = "99%",
    NINETY_FIVE = "95%",
    USED = "C\u0169"
}
export declare enum QuoteStatus {
    DRAFT = "Nh\u00E1p",
    SENT = "\u0110\u00E3 g\u1EEDi",
    CONFIRMED = "\u0110\u00E3 ch\u1ED1t",
    CANCELLED = "\u0110\u00E3 h\u1EE7y"
}
export declare enum DiscountType {
    PERCENT = "percent",
    FIXED = "fixed"
}
export declare const WARRANTY_OPTIONS: string[];
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
export interface IInventoryItem {
    _id?: string;
    stockCode: string;
    product: string;
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
    costPrice: number;
    quantity: number;
    supplier?: string;
    supplierWarranty?: string;
    serialNumber?: string;
    serialNumbers: string[];
    isSold?: boolean;
    soldToCustomer?: ICustomer;
    soldQuoteId?: string;
    soldQuoteCode?: string;
    soldDate?: Date;
    sellingPrice?: number;
    soldWarranty?: string;
    importDate: Date;
    createdBy?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare enum CustomerType {
    RETAIL = "Kh\u00E1ch l\u1EBB",
    REGULAR = "Kh\u00E1ch quen",
    VIP = "VIP",
    ENTERPRISE = "Doanh nghi\u1EC7p",
    DEALER = "\u0110\u1EA1i l\u00FD"
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
    debtStatus: 'PAID' | 'UNPAID' | 'PARTIALLY_PAID' | 'DUE_SOON' | 'OVERDUE' | 'CANCELLED';
}
export interface IQuoteItemSnapshot {
    name: string;
    productCode: string;
    condition: ProductCondition;
    costPrice: number;
    specs: IProductSpecs;
    imageUrl?: string;
    serialNumber?: string;
}
export interface IQuoteItem {
    inventoryItem: string;
    productSnapshot: IQuoteItemSnapshot;
    unitPrice: number;
    quantity: number;
    discount: number;
    discountType: DiscountType;
    warranty: string;
    serialNumber?: string;
    total: number;
    order: number;
}
export declare enum InvoiceStatus {
    UNPAID = "Ch\u01B0a thanh to\u00E1n",
    PARTIALLY_PAID = "Thanh to\u00E1n m\u1ED9t ph\u1EA7n",
    PAID = "\u0110\u00E3 thanh to\u00E1n",
    CANCELLED = "\u0110\u00E3 h\u1EE7y",
    REFUNDED = "Ho\u00E0n ti\u1EC1n"
}
export declare enum PaymentMethod {
    CASH = "Ti\u1EC1n m\u1EB7t",
    BANK_TRANSFER = "Chuy\u1EC3n kho\u1EA3n",
    MOMO = "Momo",
    VNPAY = "VNPay",
    OTHER = "Kh\u00E1c"
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
export declare enum InventoryUnitStatus {
    AVAILABLE = "AVAILABLE",
    RESERVED = "RESERVED",
    SOLD = "SOLD",
    WARRANTY = "WARRANTY",
    RETURNED = "RETURNED",
    DAMAGED = "DAMAGED"
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
    productId: string;
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
    selectedSerials?: string[];
    total: number;
    order: number;
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
    grandTotal: number;
    totalCost: number;
    profit: number;
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
export interface ISettings {
    storeName: string;
    hotline: string;
    website?: string;
    facebook?: string;
    address: string;
    email?: string;
    logoUrl?: string;
    logoPublicId?: string;
    qrPaymentUrl?: string;
    qrPaymentPublicId?: string;
    bankInfo?: string;
    terms: string[];
    footerText: string;
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
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    byCategory: Record<string, number>;
    byCondition: Record<string, number>;
    recentInventory: IInventoryItem[];
}
export interface InvoiceStats {
    totalRevenue: number;
    totalPaid: number;
    totalReceivables: number;
    totalInvoices: number;
    averageInvoiceValue: number;
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
//# sourceMappingURL=index.d.ts.map