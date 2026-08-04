import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/np_computer';

async function resetBusinessData() {
  console.log('==================================================');
  console.log('🧹 STARTING BUSINESS DATA RESET (RESET DỮ LIỆU NGHIỆP VỤ)');
  console.log('==================================================');
  console.log(`Connecting to MongoDB: ${MONGODB_URI}`);

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected successfully to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection failed');
    }

    const businessCollections = [
      'products',
      'inventoryunits',
      'inventories',
      'suppliers',
      'purchases',
      'customers',
      'quotes',
      'invoices',
      'customeractivities',
      'counters',
    ];

    console.log('\n--- Clearing Business Collections ---');
    for (const collName of businessCollections) {
      try {
        const result = await db.collection(collName).deleteMany({});
        console.log(`🗑️ Cleared collection [${collName}]: ${result.deletedCount} documents deleted.`);
      } catch (err: any) {
        console.log(`⚠️ Collection [${collName}] error/not found: ${err.message}`);
      }
    }

    console.log('\n--- Verifying Users & Admin Preservation ---');
    const userCount = await db.collection('users').countDocuments();
    const adminUser = await db.collection('users').findOne({ role: 'ADMIN' });
    console.log(`👥 Total User Accounts preserved in DB: ${userCount}`);
    console.log(`🔑 Admin Account present: ${adminUser ? `Yes (Username: ${adminUser.username})` : 'No'}`);

    console.log('\n--- Verifying Business Collection Counts (Must be 0) ---');
    let allZero = true;
    for (const collName of businessCollections) {
      const count = await db.collection(collName).countDocuments();
      console.log(`Collection [${collName}] count: ${count}`);
      if (count !== 0) allZero = false;
    }

    if (allZero) {
      console.log('\n🎉 RESET BUSINESS DATA COMPLETED 100% SUCCESSFULLY! ALL OPERATIONAL DATA IS 0.');
    } else {
      console.error('\n❌ ERROR: Some business collections still contain records.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  }
}

resetBusinessData();
