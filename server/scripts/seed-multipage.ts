import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Quote } from '../src/models/quote.model';
import { Invoice } from '../src/models/invoice.model';
import { QuoteStatus } from '../src/types';

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/np_computer';

const sampleProducts = [
  { name: 'CPU Intel Core i7 13700K (3.4GHz / 30MB / 16 nhân 24 luồng)', code: 'CPU-INTEL-13700K', brand: 'Intel', unitPrice: 9890000, qty: 1, warranty: '36 tháng', specs: '16 Cores, 24 Threads, LGA1700' },
  { name: 'Mainboard ASUS ROG STRIX Z790-A GAMING WIFI D4', code: 'MB-ASUS-Z790A', brand: 'ASUS', unitPrice: 7650000, qty: 1, warranty: '36 tháng', specs: 'ATX, LGA1700, DDR4, Wi-Fi 6E' },
  { name: 'RAM Corsair Vengeance RGB PRO 32GB (2x16GB) DDR4 3600MHz', code: 'RAM-CORSAIR-32GB', brand: 'Corsair', unitPrice: 2450000, qty: 2, warranty: '36 tháng', specs: '32GB DDR4 3600MHz RGB' },
  { name: 'VGA ASUS TUF Gaming GeForce RTX 4070 Ti SUPER 16GB GDDR6X', code: 'VGA-RTX4070TI-SUPER', brand: 'ASUS', unitPrice: 24990000, qty: 1, warranty: '36 tháng', specs: '16GB GDDR6X, DLSS 3.5' },
  { name: 'SSD Samsung 990 PRO 1TB PCIe NVMe Gen 4.0 x4', code: 'SSD-SAMSUNG-990PRO-1TB', brand: 'Samsung', unitPrice: 2990000, qty: 2, warranty: '60 tháng', specs: 'Read 7450MB/s, Write 6900MB/s' },
  { name: 'Nguồn Corsair RM850e 850W 80 Plus Gold Fully Modular', code: 'PSU-CORSAIR-RM850E', brand: 'Corsair', unitPrice: 3250000, qty: 1, warranty: '84 tháng', specs: '850W 80 Plus Gold, ATX 3.0' },
  { name: 'Tản nhiệt nước AIO NZXT Kraken Elite 360 RGB White', code: 'AIO-NZXT-KRAKEN360', brand: 'NZXT', unitPrice: 6890000, qty: 1, warranty: '72 tháng', specs: '360mm Radiator, LCD Display' },
  { name: 'Vỏ máy tính LIAN LI O11 Dynamic EVO XL White', code: 'CASE-LIANLI-O11EVO-XL', brand: 'Lian Li', unitPrice: 5990000, qty: 1, warranty: '12 tháng', specs: 'Full Tower, Dual Chamber' },
  { name: 'Bộ 3 Fan Lian Li Uni Fan SL-Infinity 120 RGB White', code: 'FAN-LIANLI-SL120-3PK', brand: 'Lian Li', unitPrice: 2350000, qty: 2, warranty: '24 tháng', specs: '120mm, Daisy Chain PWM' },
  { name: 'Màn hình ASUS ROG Strix XG27AQMR 27 inch 2K IPS 300Hz', code: 'MON-ASUS-XG27AQMR', brand: 'ASUS', unitPrice: 15490000, qty: 1, warranty: '36 tháng', specs: '27" 2K 2560x1440, Fast IPS 300Hz' },
];

async function seedMultipageDocs() {
  console.log('Connecting to MongoDB...', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');

  const dummyItems = sampleProducts.map((p, idx) => ({
    productSnapshot: {
      name: p.name,
      productCode: p.code,
      brand: p.brand,
      condition: 'New',
      costPrice: p.unitPrice * 0.85,
      specs: p.specs,
      imageUrl: '',
    },
    unitPrice: p.unitPrice,
    quantity: p.qty,
    discount: 0,
    discountType: 'fixed',
    warranty: p.warranty,
    total: p.unitPrice * p.qty,
    order: idx,
  }));

  const subtotal = dummyItems.reduce((acc, item) => acc + item.total, 0);

  // 1. Create 2-Page Quote
  const quoteDoc = {
    quoteCode: 'BG-TEST-2TRANG',
    createdDate: new Date(),
    createdBy: 'Admin',
    createdByName: 'Nguyễn Văn Admin',
    customer: {
      name: 'Công ty Cổ phần Công Nghệ X-Group (Đơn 2 trang mẫu)',
      phone: '0912.345.678',
      email: 'contact@xgroup.vn',
      address: 'Tòa nhà Landmark 81, Bình Thạnh, TP. Hồ Chí Minh',
      notes: 'Đơn hàng cấu hình phòng máy Đồ Họa 3D nhiều linh kiện (Test xuất PDF 2 trang)',
    },
    items: dummyItems,
    subtotal: subtotal,
    discount: 1000000,
    discountType: 'fixed',
    shippingFee: 0,
    vatEnabled: false,
    vatPercent: 0,
    vatAmount: 0,
    grandTotal: subtotal - 1000000,
    totalCost: subtotal * 0.85,
    profit: subtotal * 0.15 - 1000000,
    status: QuoteStatus.CONFIRMED,
    notes: 'Báo giá bộ máy Workstation cao cấp 10 linh kiện cho phòng đồ họa.',
  };

  await Quote.deleteOne({ quoteCode: 'BG-TEST-2TRANG' });
  await Quote.create(quoteDoc);
  console.log('✅ Created 2-Page Sample Quote: BG-TEST-2TRANG');

  // 2. Create 2-Page Invoice
  const invoiceDoc = {
    invoiceCode: 'HD-TEST-2TRANG',
    quoteCode: 'BG-TEST-2TRANG',
    createdDate: new Date(),
    createdBy: 'Admin',
    createdByName: 'Nguyễn Văn Admin',
    customer: {
      name: 'Công ty Cổ phần Công Nghệ X-Group (Đơn 2 trang mẫu)',
      phone: '0912.345.678',
      email: 'contact@xgroup.vn',
      address: 'Tòa nhà Landmark 81, Bình Thạnh, TP. Hồ Chí Minh',
      notes: 'Hóa đơn bán hàng bộ dàn máy tính đồ họa cao cấp',
    },
    items: dummyItems.map((item) => ({
      ...item,
      selectedSerials: [`SN-${item.productSnapshot.productCode}-001`],
    })),
    subtotal: subtotal,
    discount: 1000000,
    discountType: 'fixed',
    shippingFee: 0,
    vatEnabled: false,
    vatPercent: 0,
    vatAmount: 0,
    grandTotal: subtotal - 1000000,
    totalPaid: subtotal - 1000000 - 5000000,
    remainingAmount: 5000000,
    paymentStatus: 'partial',
    notes: 'Đã cọc trước 80%, còn nợ 5.000.000đ sau khi nghiệm thu.',
  };

  await Invoice.deleteOne({ invoiceCode: 'HD-TEST-2TRANG' });
  await Invoice.create(invoiceDoc);
  console.log('✅ Created 2-Page Sample Invoice: HD-TEST-2TRANG');

  await mongoose.disconnect();
  console.log('Done!');
}

seedMultipageDocs().catch(console.error);
