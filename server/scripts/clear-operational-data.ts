import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/np_computer';

async function clearOperationalData() {
  try {
    console.log('Connecting to MongoDB:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);

    const db = mongoose.connection.db;
    if (!db) throw new Error('Database connection failed');

    const collectionsToClear = [
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

    for (const collName of collectionsToClear) {
      const collection = db.collection(collName);
      const count = await collection.countDocuments();
      await collection.deleteMany({});
      console.log(`🧹 Cleared ${count} records from collection [${collName}]`);
    }

    const productCount = await db.collection('products').countDocuments();
    console.log(`📦 Kept ${productCount} Master Products intact in [products] collection.`);

    console.log('🎉 Operational data cleared successfully! Products preserved.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to clear operational data:', err);
    process.exit(1);
  }
}

clearOperationalData();
