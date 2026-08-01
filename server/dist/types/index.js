"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryUnitStatus = exports.PaymentMethod = exports.InvoiceStatus = exports.CustomerType = exports.WARRANTY_OPTIONS = exports.DiscountType = exports.QuoteStatus = exports.ProductCondition = exports.ProductCategory = void 0;
// ============================================
// Enums
// ============================================
var ProductCategory;
(function (ProductCategory) {
    ProductCategory["CPU"] = "CPU";
    ProductCategory["RAM"] = "RAM";
    ProductCategory["SSD"] = "SSD";
    ProductCategory["HDD"] = "HDD";
    ProductCategory["VGA"] = "VGA";
    ProductCategory["MAINBOARD"] = "Mainboard";
    ProductCategory["PSU"] = "PSU";
    ProductCategory["CASE"] = "Case";
    ProductCategory["MONITOR"] = "M\u00E0n h\u00ECnh";
    ProductCategory["COOLER"] = "T\u1EA3n nhi\u1EC7t";
    ProductCategory["ACCESSORY"] = "Ph\u1EE5 ki\u1EC7n";
    ProductCategory["LAPTOP"] = "Laptop";
    ProductCategory["PC"] = "PC Nguy\u00EAn b\u1ED9";
})(ProductCategory || (exports.ProductCategory = ProductCategory = {}));
var ProductCondition;
(function (ProductCondition) {
    ProductCondition["NEW"] = "New";
    ProductCondition["LIKE_NEW"] = "Like New";
    ProductCondition["NINETY_NINE"] = "99%";
    ProductCondition["NINETY_FIVE"] = "95%";
    ProductCondition["USED"] = "C\u0169";
})(ProductCondition || (exports.ProductCondition = ProductCondition = {}));
var QuoteStatus;
(function (QuoteStatus) {
    QuoteStatus["DRAFT"] = "Nh\u00E1p";
    QuoteStatus["SENT"] = "\u0110\u00E3 g\u1EEDi";
    QuoteStatus["CONFIRMED"] = "\u0110\u00E3 ch\u1ED1t";
    QuoteStatus["CANCELLED"] = "\u0110\u00E3 h\u1EE7y";
})(QuoteStatus || (exports.QuoteStatus = QuoteStatus = {}));
var DiscountType;
(function (DiscountType) {
    DiscountType["PERCENT"] = "percent";
    DiscountType["FIXED"] = "fixed";
})(DiscountType || (exports.DiscountType = DiscountType = {}));
exports.WARRANTY_OPTIONS = [
    'Bao test lấy',
    '7 ngày (1 tuần)',
    '1 tháng',
    '3 tháng',
    '6 tháng',
    '12 tháng',
    '24 tháng',
    '36 tháng',
];
var CustomerType;
(function (CustomerType) {
    CustomerType["RETAIL"] = "Kh\u00E1ch l\u1EBB";
    CustomerType["REGULAR"] = "Kh\u00E1ch quen";
    CustomerType["VIP"] = "VIP";
    CustomerType["ENTERPRISE"] = "Doanh nghi\u1EC7p";
    CustomerType["DEALER"] = "\u0110\u1EA1i l\u00FD";
})(CustomerType || (exports.CustomerType = CustomerType = {}));
var InvoiceStatus;
(function (InvoiceStatus) {
    InvoiceStatus["UNPAID"] = "Ch\u01B0a thanh to\u00E1n";
    InvoiceStatus["PARTIALLY_PAID"] = "Thanh to\u00E1n m\u1ED9t ph\u1EA7n";
    InvoiceStatus["PAID"] = "\u0110\u00E3 thanh to\u00E1n";
    InvoiceStatus["CANCELLED"] = "\u0110\u00E3 h\u1EE7y";
    InvoiceStatus["REFUNDED"] = "Ho\u00E0n ti\u1EC1n";
})(InvoiceStatus || (exports.InvoiceStatus = InvoiceStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "Ti\u1EC1n m\u1EB7t";
    PaymentMethod["BANK_TRANSFER"] = "Chuy\u1EC3n kho\u1EA3n";
    PaymentMethod["MOMO"] = "Momo";
    PaymentMethod["VNPAY"] = "VNPay";
    PaymentMethod["OTHER"] = "Kh\u00E1c";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var InventoryUnitStatus;
(function (InventoryUnitStatus) {
    InventoryUnitStatus["AVAILABLE"] = "AVAILABLE";
    InventoryUnitStatus["RESERVED"] = "RESERVED";
    InventoryUnitStatus["SOLD"] = "SOLD";
    InventoryUnitStatus["WARRANTY"] = "WARRANTY";
    InventoryUnitStatus["RETURNED"] = "RETURNED";
    InventoryUnitStatus["DAMAGED"] = "DAMAGED";
})(InventoryUnitStatus || (exports.InventoryUnitStatus = InventoryUnitStatus = {}));
//# sourceMappingURL=index.js.map