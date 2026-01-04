import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CommunicationMethod from '../models/CommunicationMethod';
import DonationReason from '../models/DonationReason';

dotenv.config();

const seedData = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined');
    }

    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    // Seed Communication Methods
    const communicationMethods = [
      {
        name: 'Email',
        type: 'email',
        value: 'bangchan.foundation@gmail.com',
        icon: 'mail',
        is_active: true,
        order: 1,
      },
      {
        name: 'Telegram',
        type: 'telegram',
        value: '@bangchanfoundation',
        icon: 'message-circle',
        is_active: true,
        order: 2,
      },
    ];

    // Check if methods already exist
    const existingMethods = await CommunicationMethod.find();
    if (existingMethods.length === 0) {
      await CommunicationMethod.insertMany(communicationMethods);
      console.log('✅ Seeded communication methods');
    } else {
      console.log('ℹ️  Communication methods already exist, skipping...');
    }

    // Seed Donation Reasons (optional - can be added via admin dashboard)
    const donationReasons = [
      {
        title: 'Supporting Education',
        description: 'Helping provide quality education to children in underserved communities',
        is_active: true,
      },
      {
        title: 'Healthcare Support',
        description: 'Funding essential healthcare services for communities in need',
        is_active: true,
      },
      {
        title: 'Mentorship Programs',
        description: 'Supporting mentorship and skill development programs',
        is_active: true,
      },
    ];

    const existingReasons = await DonationReason.find();
    if (existingReasons.length === 0) {
      await DonationReason.insertMany(donationReasons);
      console.log('✅ Seeded donation reasons');
    } else {
      console.log('ℹ️  Donation reasons already exist, skipping...');
    }

    console.log('✅ Seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();

