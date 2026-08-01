import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/np_computer';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function migrate() {
  try {
    console.log('Connecting to MongoDB:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection failed');
    }

    const User = db.collection('users');

    // 1. Ensure Admin User
    let adminDoc = await User.findOne({ usernameNormalized: ADMIN_USERNAME.toLowerCase() });
    if (!adminDoc) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(ADMIN_PASSWORD, salt);
      const res = await User.insertOne({
        username: ADMIN_USERNAME,
        usernameNormalized: ADMIN_USERNAME.toLowerCase(),
        passwordHash: hash,
        role: 'ADMIN',
        status: 'ACTIVE',
        isActive: true,
        registeredAt: new Date(),
        activatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      adminDoc = { _id: res.insertedId, username: ADMIN_USERNAME };
      console.log('✅ Created default Admin account:', ADMIN_USERNAME);
    } else {
      console.log('ℹ️ Admin account already exists:', adminDoc.username);
    }

    // 2. Ensure Primary Owner User for existing single-tenant data
    let defaultOwnerDoc = await User.findOne({ usernameNormalized: 'owner_default' });
    if (!defaultOwnerDoc) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('OwnerPassword123!', salt);
      const res = await User.insertOne({
        username: 'owner_default',
        usernameNormalized: 'owner_default',
        passwordHash: hash,
        role: 'USER',
        status: 'ACTIVE',
        isActive: true,
        registeredAt: new Date(),
        activatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      defaultOwnerDoc = { _id: res.insertedId, username: 'owner_default' };
      console.log('✅ Created default Owner User for data migration:', defaultOwnerDoc._id);
    } else {
      console.log('ℹ️ Default Owner User already exists:', defaultOwnerDoc._id);
    }

    const ownerId = defaultOwnerDoc._id;

    // List of operational collections to migrate ownerId
    const collectionsToMigrate = [
      'products',
      'inventoryunits',
      'inventories',
      'suppliers',
      'purchases',
      'customers',
      'quotes',
      'invoices',
      'settings',
    ];

    for (const collName of collectionsToMigrate) {
      try {
        const collection = db.collection(collName);
        const updateResult = await collection.updateMany(
          { ownerId: { $exists: false } },
          { $set: { ownerId: ownerId } }
        );
        console.log(`📦 Migrated ${updateResult.modifiedCount} records in [${collName}] to ownerId: ${ownerId}`);
      } catch (err: any) {
        console.warn(`Warning migrating ${collName}:`, err.message);
      }
    }

    // 4. Drop legacy indexes that conflict with compound index (ignore if index not found)
    const legacyIndexMap: Record<string, string[]> = {
      products: ['productId_1', 'productCode_1', 'barcode_1'],
      inventoryunits: ['serialNumber_1'],
      suppliers: ['supplierCode_1'],
      customers: ['customerCode_1'],
      quotes: ['quoteCode_1'],
      invoices: ['invoiceCode_1'],
      purchases: ['purchaseCode_1'],
      inventories: ['stockCode_1'],
    };

    for (const [collName, indexNames] of Object.entries(legacyIndexMap)) {
      const collection = db.collection(collName);
      for (const idxName of indexNames) {
        try {
          await collection.dropIndex(idxName);
          console.log(`🔥 Dropped legacy unique index [${idxName}] from collection [${collName}]`);
        } catch (e: any) {
          // Index didn't exist or already dropped
        }
      }
    }

    console.log('🎉 Migration to Multi-User architecture completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
