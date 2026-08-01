import { connectDB } from '../config/database';
import { Product, Inventory, Quote, Counter, Settings } from '../models';
import mongoose from 'mongoose';

const clearDatabase = async () => {
  await connectDB();

  console.log('🧹 Clearing all products, inventory, quotes, counters...');
  await Product.deleteMany({});
  await Inventory.deleteMany({});
  await Quote.deleteMany({});
  await Counter.deleteMany({});

  let settings = await Settings.findOne();
  if (!settings) {
    await Settings.create({
      storeName: 'NP Computer',
      hotline: '0901.234.567',
      website: 'npcomputer.vn',
      facebook: 'facebook.com/npcomputer.official',
      address: '456 Lê Thanh Nghị, Hai Bà Trưng, Hà Nội',
      email: 'contact@npcomputer.vn',
      bankInfo: 'Ngân hàng MB Bank\nSTK: 0901234567\nChủ TK: CỬA HÀNG NP COMPUTER',
      terms: [
        'Sản phẩm linh kiện được bảo hành theo tem và serial number.',
        'Bảo hành 1 đổi 1 trong 7 ngày đầu nếu có lỗi phần cứng.',
        'Không bảo hành trường hợp rơi vỡ, vào nước, cháy nổ hoặc tem bị rách.',
        'Báo giá có giá trị trong vòng 7 ngày kể từ ngày lập.',
      ],
      footerText: 'Cảm ơn quý khách đã tin tưởng và chọn linh kiện tại NP Computer! 🙏',
    });
  }

  console.log('✅ Database completely cleared! Ready for fresh entries.');
  mongoose.connection.close();
};

clearDatabase().catch((err) => {
  console.error('❌ Clear DB error:', err);
  mongoose.connection.close();
});
