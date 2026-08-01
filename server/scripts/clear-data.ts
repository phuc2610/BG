import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI không tồn tại trong .env');
  process.exit(1);
}

async function clearData() {
  try {
    console.log('🔌 Đang kết nối tới MongoDB...');
    await mongoose.connect(MONGODB_URI!);
    console.log('✅ Đã kết nối MongoDB thành công.');

    const collections = await mongoose.connection.db!.collections();

    for (const collection of collections) {
      const name = collection.collectionName;
      await collection.deleteMany({});
      console.log(`🧹 Đã xóa toàn bộ dữ liệu trong collection: ${name}`);
    }

    console.log('\n🎉 ĐÃ CLEAR TOÀN BỘ DỮ LIỆU CŨ THÀNH CÔNG! HỆ THỐNG ĐÃ SẴN SÀNG ĐỂ NHẬP MỚI.');
  } catch (error) {
    console.error('❌ Lỗi khi xóa dữ liệu:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

clearData();
