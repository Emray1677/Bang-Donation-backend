import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';

dotenv.config();

const createAdmin = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined');
    }

    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    const email = 'Mosesemray@gmail.com';
    const password = 'Emmanuel1677';
    const full_name = 'Admin User';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists. Updating password and role...');
      existingAdmin.password = password; // Will be hashed by pre-save hook
      existingAdmin.role = 'admin';
      await existingAdmin.save();
      console.log('✅ Admin user updated successfully!');
      console.log(`   Email: ${email}`);
      console.log(`   Role: admin`);
    } else {
      // Create new admin user
      const admin = await User.create({
        email: email.toLowerCase(),
        password,
        full_name,
        role: 'admin',
        is_verified: true,
      });
      console.log('✅ Admin user created successfully!');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      console.log(`   Role: admin`);
      console.log(`   ID: ${admin._id}`);
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
};

createAdmin();

