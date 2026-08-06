import mongoose from 'mongoose';
import { config } from './index';

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(config.mongodbUri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Sync indexes for InventoryUnit to remove obsolete indexes
    try {
      const { InventoryUnit } = await import('../models/inventoryUnit.model');
      const { Product } = await import('../models/product.model');
      await InventoryUnit.syncIndexes();
      console.log('✅ InventoryUnit indexes synced');

      // Sync sellingPrice on Product model from existing InventoryUnits
      const unitsWithListPrice = await InventoryUnit.find({ listPrice: { $gt: 0 } }).exec();
      for (const u of unitsWithListPrice) {
        if (u.productId && u.listPrice) {
          await Product.findByIdAndUpdate(u.productId, { sellingPrice: u.listPrice });
        }
      }
      console.log('✅ Synchronized listPrice across all products');
    } catch (syncErr) {
      console.warn('⚠️ Warning syncing InventoryUnit indexes or list prices:', syncErr);
    }
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};
