import { connectDB } from '../config/database';
import { Product, Inventory, Quote, Settings, generateProductId, generateProductCode, generateStockCode, generateQuoteCode } from '../models';
import { ProductCategory, ProductCondition, QuoteStatus, DiscountType } from '../types';
import mongoose from 'mongoose';

const seed = async () => {
  await connectDB();

  console.log('🧹 Cleaning existing data...');
  await Product.deleteMany({});
  await Inventory.deleteMany({});
  await Quote.deleteMany({});
  await Settings.deleteMany({});

  console.log('⚙️ Creating default settings...');
  await Settings.create({
    storeName: 'NP Computer',
    hotline: '0901.234.567',
    website: 'npcomputer.vn',
    facebook: 'facebook.com/npcomputer.official',
    address: '456 Lê Thanh Nghị, Hai Bà Trưng, Hà Nội',
    email: 'contact@npcomputer.vn',
    bankInfo: 'Ngân hàng MB Bank\nSTK: 0901234567\nChủ TK: CỬA HÀNG NP COMPUTER',
    terms: [
      'Linh kiện được bảo hành theo tem và serial number ghi trên báo giá.',
      'Bảo hành 1 đổi 1 trong 7 ngày đầu nếu có lỗi phần cứng từ nhà sản xuất.',
      'Không bảo hành trường hợp rơi vỡ, vào nước, cháy nổ hoặc tem bảo hành bị rách.',
      'Báo giá có giá trị trong vòng 7 ngày kể từ ngày lập.',
    ],
    footerText: 'Cảm ơn quý khách đã tin tưởng và chọn linh kiện tại NP Computer! 🙏',
  });

  console.log('💻 Creating Master Product Catalog entries...');

  const sampleProducts = [
    {
      name: 'CPU Intel Core i7-10700T (8 Nhân 16 Luồng)',
      category: ProductCategory.CPU,
      brand: 'Intel',
      model: 'Core i7-10700T',
      description: 'CPU đồng bộ Dell siêu tiết kiệm điện, hiệu năng cao.',
      specs: {
        cpu: 'Intel Core i7-10700T (8 nhân 16 luồng, 2.0GHz - 4.5GHz)',
      },
      images: [
        {
          url: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=800&q=80',
          publicId: 'sample_cpu_1',
          order: 0,
          isThumbnail: true,
        },
      ],
    },
    {
      name: 'RAM Kingston HyperX Fury 16GB DDR4 3200MHz Bus',
      category: ProductCategory.RAM,
      brand: 'Kingston',
      model: 'HyperX Fury 16GB',
      description: 'RAM tản nhiệt đen bọc nhôm cao cấp.',
      specs: {
        ram: '16GB DDR4 3200MHz Bus C16',
      },
      images: [
        {
          url: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=800&q=80',
          publicId: 'sample_ram_1',
          order: 0,
          isThumbnail: true,
        },
      ],
    },
    {
      name: 'Card Màn Hình ASUS TUF Gaming RTX 3060 12GB GDDR6',
      category: ProductCategory.VGA,
      brand: 'ASUS',
      model: 'TUF-RTX3060-O12G',
      description: 'VGA 3 quạt siêu mát, VRAM 12GB đồ họa mượt mà.',
      specs: {
        vga: 'NVIDIA GeForce RTX 3060 12GB GDDR6',
      },
      images: [
        {
          url: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=800&q=80',
          publicId: 'sample_vga_1',
          order: 0,
          isThumbnail: true,
        },
      ],
    },
  ];

  const createdProducts = [];
  for (const p of sampleProducts) {
    const productId = await generateProductId();
    const productCode = await generateProductCode(p.category);
    const barcode = `NPC${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const doc = await Product.create({
      ...p,
      modelName: p.model,
      productId,
      productCode,
      barcode,
    });
    createdProducts.push(doc);
  }

  console.log(`✅ Seeded ${createdProducts.length} Master Products.`);

  console.log('📦 Creating Inventory Stock Lot entries...');
  const sampleLots = [
    {
      product: createdProducts[0]._id,
      condition: ProductCondition.LIKE_NEW,
      costPrice: 2800000,
      quantity: 5,
    },
    {
      product: createdProducts[0]._id,
      condition: ProductCondition.NINETY_FIVE,
      costPrice: 2400000,
      quantity: 2,
    },
    {
      product: createdProducts[1]._id,
      condition: ProductCondition.NEW,
      costPrice: 750000,
      quantity: 10,
    },
    {
      product: createdProducts[2]._id,
      condition: ProductCondition.NINETY_NINE,
      costPrice: 4800000,
      quantity: 3,
    },
  ];

  const createdLots = [];
  for (const lot of sampleLots) {
    const stockCode = await generateStockCode();
    const doc = await Inventory.create({
      ...lot,
      stockCode,
      createdBy: 'System Seed',
    });
    createdLots.push(doc);
  }

  console.log(`✅ Seeded ${createdLots.length} Inventory Stock Lots.`);

  console.log('📝 Creating sample quote...');
  const quoteCode = await generateQuoteCode();
  const sampleLot = createdLots[0];
  const sampleMaster = createdProducts[0];

  await Quote.create({
    quoteCode,
    createdDate: new Date(),
    createdBy: 'System Seed',
    customer: {
      name: 'Anh Minh (Công ty công nghệ ABC)',
      phone: '0988.777.666',
      email: 'minh.abc@gmail.com',
      address: 'Tầng 5, Tòa nhà Landmark 81, TP.HCM',
      notes: 'Giao linh kiện gấp trước 17h',
    },
    items: [
      {
        inventoryItem: sampleLot._id,
        productSnapshot: {
          name: sampleMaster.name,
          productCode: sampleMaster.productCode,
          condition: sampleLot.condition,
          costPrice: sampleLot.costPrice,
          specs: sampleMaster.specs,
          imageUrl: sampleMaster.images[0]?.url,
        },
        unitPrice: 3500000,
        quantity: 2,
        discount: 200000,
        discountType: DiscountType.FIXED,
        warranty: '12 tháng',
        total: 6800000,
        order: 0,
      },
    ],
    subtotal: 7000000,
    discount: 200000,
    discountType: DiscountType.FIXED,
    shippingFee: 50000,
    vatEnabled: false,
    vatPercent: 10,
    vatAmount: 0,
    grandTotal: 6850000,
    totalCost: 5600000,
    profit: 1250000,
    status: QuoteStatus.SENT,
    notes: 'Báo giá linh kiện chưa bao gồm phí lắp đặt tại nhà.',
  });

  console.log('✅ Seed completed successfully!');
  mongoose.connection.close();
};

seed().catch((err) => {
  console.error('❌ Seed error:', err);
  mongoose.connection.close();
});
