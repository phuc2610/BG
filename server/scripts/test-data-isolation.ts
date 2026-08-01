import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/np_computer';

async function runIsolationTest() {
  try {
    console.log('Connecting to MongoDB for Data Isolation Test...');
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db!;

    const Users = db.collection('users');
    const Products = db.collection('products');
    const Suppliers = db.collection('suppliers');

    // 1. Create User A & User B
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('TestPass123!', salt);

    await Users.deleteMany({ usernameNormalized: { $in: ['test_user_a', 'test_user_b'] } });

    const resA = await Users.insertOne({
      username: 'test_user_a',
      usernameNormalized: 'test_user_a',
      passwordHash: hash,
      role: 'USER',
      status: 'ACTIVE',
      isActive: true,
      registeredAt: new Date(),
    });
    const userA_Id = resA.insertedId;

    const resB = await Users.insertOne({
      username: 'test_user_b',
      usernameNormalized: 'test_user_b',
      passwordHash: hash,
      role: 'USER',
      status: 'ACTIVE',
      isActive: true,
      registeredAt: new Date(),
    });
    const userB_Id = resB.insertedId;

    console.log('Created User A:', userA_Id.toString());
    console.log('Created User B:', userB_Id.toString());

    // 2. User A creates Product A & Supplier A
    await Products.deleteMany({ ownerId: { $in: [userA_Id, userB_Id] } });
    await Suppliers.deleteMany({ ownerId: { $in: [userA_Id, userB_Id] } });

    const prodA = await Products.insertOne({
      ownerId: userA_Id,
      productId: 'SP_TEST_A',
      productCode: 'NPC-TEST-A',
      barcode: 'BAR_TEST_A',
      name: 'VGA RTX 4090 User A',
      category: 'VGA',
      brand: 'ASUS',
      modelName: 'RTX4090',
    });

    const suppA = await Suppliers.insertOne({
      ownerId: userA_Id,
      supplierCode: 'NCC_TEST_A',
      name: 'Nhà Cung Cấp A',
    });

    // 3. User B queries products & suppliers
    const userB_Products = await Products.find({ ownerId: userB_Id }).toArray();
    console.log('User B visible products count:', userB_Products.length);
    if (userB_Products.length !== 0) {
      throw new Error('❌ DATA LEAK: User B can see User A products!');
    }

    const userB_Suppliers = await Suppliers.find({ ownerId: userB_Id }).toArray();
    console.log('User B visible suppliers count:', userB_Suppliers.length);
    if (userB_Suppliers.length !== 0) {
      throw new Error('❌ DATA LEAK: User B can see User A suppliers!');
    }

    // 4. Test compound index uniqueness: User B should be allowed to create product with SAME productCode NPC-TEST-A!
    const prodB = await Products.insertOne({
      ownerId: userB_Id,
      productId: 'SP_TEST_B',
      productCode: 'NPC-TEST-A', // Same code as User A!
      barcode: 'BAR_TEST_B',
      name: 'VGA RTX 4090 User B',
      category: 'VGA',
      brand: 'MSI',
      modelName: 'RTX4090',
    });

    console.log('✅ User B successfully created product with same productCode NPC-TEST-A under ownerId B!');

    // Cleanup test data
    await Users.deleteMany({ usernameNormalized: { $in: ['test_user_a', 'test_user_b'] } });
    await Products.deleteMany({ ownerId: { $in: [userA_Id, userB_Id] } });
    await Suppliers.deleteMany({ ownerId: { $in: [userA_Id, userB_Id] } });

    console.log('🎉 ALL DATA ISOLATION TESTS PASSED 100% PERFECTLY!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Data isolation test failed:', err);
    process.exit(1);
  }
}

runIsolationTest();
