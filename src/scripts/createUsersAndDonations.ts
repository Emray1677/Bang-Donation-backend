import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import Donation from '../models/Donation';

// Load environment variables
dotenv.config({ path: '.env' });

// Realistic names by country
const names = {
  usa: [
    'James Smith', 'Sarah Johnson', 'Michael Williams', 'Emily Brown', 'David Jones',
    'Jessica Garcia', 'Christopher Miller', 'Ashley Davis', 'Matthew Rodriguez', 'Amanda Martinez',
    'Daniel Wilson', 'Melissa Anderson', 'Robert Taylor', 'Nicole Thomas', 'William Hernandez',
    'Stephanie Moore', 'Joseph Martin', 'Rebecca Jackson', 'Richard Thompson', 'Michelle White',
    'Charles Harris', 'Laura Sanchez', 'Thomas Clark', 'Kimberly Ramirez', 'Christopher Lewis',
    'Amy Robinson', 'Daniel Walker', 'Angela Young', 'Mark Allen', 'Jennifer King',
  ],
  southKorea: [
    'Min-jun Kim', 'So-young Park', 'Ji-hoon Lee', 'Hye-jin Choi', 'Seung-min Jung',
    'Eun-ji Kim', 'Tae-hyun Park', 'Yoon-ah Lee', 'Jae-won Choi', 'Hae-rin Jung',
    'Dong-hyun Kim', 'Ji-eun Park', 'Sang-min Lee', 'Mi-soo Choi', 'Hyun-woo Jung',
    'Seo-yeon Kim', 'Jin-woo Park', 'Na-young Lee', 'Joon-ho Choi', 'Ji-woo Jung',
    'Min-seo Kim', 'Tae-woo Park', 'Yoon-hee Lee', 'Ji-soo Choi', 'Seo-jun Jung',
    'Ha-eun Kim', 'Seo-yoon Park', 'Jun-seo Lee', 'Ye-eun Choi', 'Do-hyun Jung',
  ],
  canada: [
    'Emily Chen', 'James MacDonald', 'Sarah Tremblay', 'Michael Brown', 'Jessica Gagnon',
    'David Roy', 'Amanda Leclerc', 'Matthew Gauthier', 'Melissa Bouchard', 'Daniel Cote',
    'Nicole Lavoie', 'Christopher Fortin', 'Rebecca Pelletier', 'Joseph Bergeron', 'Michelle Leblanc',
    'Richard Martel', 'Laura Gagnon', 'Thomas Dion', 'Kimberly Boudreau', 'Mark Dubois',
    'Jennifer Ouellet', 'Robert Carrier', 'Stephanie Boucher', 'William Poirier', 'Angela Beaulieu',
    'Charles Paquette', 'Amy Morin', 'Daniel Gilbert', 'Melissa Roux', 'Christopher Perreault',
  ],
  australia: [
    'Oliver Smith', 'Charlotte Jones', 'William Brown', 'Amelia Wilson', 'James Taylor',
    'Isabella Anderson', 'Henry Thomas', 'Mia Jackson', 'Alexander White', 'Harper Harris',
    'Mason Martin', 'Evelyn Thompson', 'Ethan Garcia', 'Sophia Martinez', 'Lucas Robinson',
    'Grace Clark', 'Benjamin Rodriguez', 'Lily Lewis', 'Daniel Lee', 'Chloe Walker',
    'Matthew Hall', 'Zoe Allen', 'Aiden Young', 'Aria King', 'Samuel Wright',
    'Scarlett Lopez', 'Jackson Hill', 'Victoria Green', 'Owen Adams', 'Penelope Baker',
  ],
};

// Email domains
const emailDomains = {
  usa: ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'],
  southKorea: ['naver.com', 'gmail.com', 'daum.net', 'kakao.com', 'hanmail.net'],
  canada: ['gmail.com', 'yahoo.ca', 'hotmail.com', 'outlook.com', 'rogers.com'],
  australia: ['gmail.com', 'yahoo.com.au', 'outlook.com', 'hotmail.com', 'bigpond.com'],
};

// Generate email from name
const generateEmail = (name: string, country: 'usa' | 'southKorea' | 'canada' | 'australia'): string => {
  const domains = emailDomains[country];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const namePart = name.toLowerCase().replace(/[^a-z]/g, '');
  const randomNum = Math.floor(Math.random() * 1000);
  return `${namePart}${randomNum}@${domain}`;
};

// Generate random donation amount ($500 - $5000)
const getRandomAmount = (): number => {
  return Math.floor(Math.random() * 4501) + 500; // 500 to 5000
};

// Random status
const getRandomStatus = (): 'pending' | 'confirmed' | 'completed' => {
  const statuses: ('pending' | 'confirmed' | 'completed')[] = ['pending', 'confirmed', 'completed'];
  return statuses[Math.floor(Math.random() * statuses.length)];
};

// Random date within last 6 months
const getRandomDate = (): Date => {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const randomTime = sixMonthsAgo.getTime() + Math.random() * (now.getTime() - sixMonthsAgo.getTime());
  return new Date(randomTime);
};

const createUsersAndDonations = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      console.error('❌ MONGODB_URI is not defined in environment variables');
      process.exit(1);
    }

    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    const countries: ('usa' | 'southKorea' | 'canada' | 'australia')[] = ['usa', 'southKorea', 'canada', 'australia'];
    const usersPerCountry = 30; // 30 users per country = 120 total
    const defaultPassword = 'password123'; // Default password for all users

    let totalUsers = 0;
    let totalDonations = 0;

    for (const country of countries) {
      console.log(`\n🌍 Creating users from ${country === 'southKorea' ? 'South Korea' : country.toUpperCase()}...`);
      
      const countryNames = names[country];
      const usersToCreate = countryNames.slice(0, usersPerCountry);

      for (let i = 0; i < usersToCreate.length; i++) {
        const fullName = usersToCreate[i];
        const email = generateEmail(fullName, country);

        try {
          // Check if user already exists
          const existingUser = await User.findOne({ email });
          if (existingUser) {
            console.log(`  ⚠️  User ${email} already exists, skipping...`);
            continue;
          }

          // Create user
          const user = await User.create({
            email,
            password: defaultPassword,
            full_name: fullName,
            role: 'user',
            is_verified: false,
          });

          // Create donation for this user
          const donationAmount = getRandomAmount();
          const donationStatus = getRandomStatus();
          const donationDate = getRandomDate();

          const donation = await Donation.create({
            user_id: user._id,
            amount: donationAmount,
            status: donationStatus,
            is_anonymous: Math.random() > 0.7, // 30% anonymous
            created_at: donationDate,
            ...(donationStatus === 'confirmed' || donationStatus === 'completed' ? {
              confirmed_at: new Date(donationDate.getTime() + Math.random() * 24 * 60 * 60 * 1000),
            } : {}),
            ...(donationStatus === 'completed' ? {
              completed_at: new Date(donationDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000),
            } : {}),
          });

          totalUsers++;
          totalDonations++;

          if ((i + 1) % 10 === 0) {
            console.log(`  ✓ Created ${i + 1}/${usersToCreate.length} users...`);
          }
        } catch (error: any) {
          console.error(`  ❌ Error creating user ${email}:`, error.message);
        }
      }

      console.log(`  ✅ Completed ${country === 'southKorea' ? 'South Korea' : country.toUpperCase()} - ${usersToCreate.length} users created`);
    }

    console.log(`\n\n🎉 Successfully created:`);
    console.log(`   👥 Users: ${totalUsers}`);
    console.log(`   💰 Donations: ${totalDonations}`);
    
    // Show summary
    const confirmedDonations = await Donation.countDocuments({ status: { $in: ['confirmed', 'completed'] } });
    const totalRaised = await Donation.aggregate([
      { $match: { status: { $in: ['confirmed', 'completed'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalAmount = totalRaised[0]?.total || 0;

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Confirmed/Completed Donations: ${confirmedDonations}`);
    console.log(`   💵 Total Raised: $${totalAmount.toLocaleString()}`);
    console.log(`\n✅ All done!\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

createUsersAndDonations();

