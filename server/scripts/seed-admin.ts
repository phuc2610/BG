import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/np_computer';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = '11229977aa';

async function seedAdmin() {
  try {
    console.log('Connecting to MongoDB:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);

    const db = mongoose.connection.db;
    if (!db) throw new Error('Database connection failed');

    const User = db.collection('users');
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(ADMIN_PASSWORD, salt);

    const result = await User.updateOne(
      { usernameNormalized: ADMIN_USERNAME.toLowerCase() },
      {
        $set: {
          username: ADMIN_USERNAME,
          usernameNormalized: ADMIN_USERNAME.toLowerCase(),
          passwordHash: hash,
          role: 'ADMIN',
          status: 'ACTIVE',
          isActive: true,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          registeredAt: new Date(),
          activatedAt: new Date(),
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    console.log(`✅ Admin account updated successfully!`);
    console.log(`Username: ${ADMIN_USERNAME}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log(`Status: ACTIVE | Role: ADMIN`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to seed admin:', err);
    process.exit(1);
  }
}

seedAdmin();
