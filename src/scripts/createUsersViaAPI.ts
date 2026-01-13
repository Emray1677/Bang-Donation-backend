import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

// Get API URL from environment or use default
const API_URL = process.env.API_URL || 'https://bang-donation-backend.onrender.com/api';

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

// Delay helper to avoid rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Signup user via API
const signupUser = async (email: string, password: string, fullName: string) => {
  try {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' })) as { message?: string };
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as { token: string };
    return data.token; // Return token for creating donations
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Signup failed: ${message}`);
  }
};

// Create donation via API
const createDonation = async (token: string, amount: number) => {
  try {
    const response = await fetch(`${API_URL}/donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount,
        is_anonymous: Math.random() > 0.7, // 30% anonymous
        message: Math.random() > 0.5 ? `Thank you for the amazing work!` : undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' })) as { message?: string };
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Donation creation failed: ${message}`);
  }
};

const createUsersAndDonations = async () => {
  try {
    console.log(`\n🚀 Starting user and donation creation via API...`);
    console.log(`   API URL: ${API_URL}\n`);

    const countries: ('usa' | 'southKorea' | 'canada' | 'australia')[] = ['usa', 'southKorea', 'canada', 'australia'];
    const usersPerCountry = 30; // 30 users per country = 120 total
    const defaultPassword = 'password123'; // Default password for all users

    let totalUsers = 0;
    let totalDonations = 0;
    let failedUsers = 0;
    let failedDonations = 0;

    for (const country of countries) {
      console.log(`\n🌍 Creating users from ${country === 'southKorea' ? 'South Korea' : country.toUpperCase()}...`);
      
      const countryNames = names[country];
      const usersToCreate = countryNames.slice(0, usersPerCountry);

      for (let i = 0; i < usersToCreate.length; i++) {
        const fullName = usersToCreate[i];
        const email = generateEmail(fullName, country);

        try {
          // Signup user via API
          const token = await signupUser(email, defaultPassword, fullName);
          totalUsers++;

          // Wait a bit to avoid rate limiting
          await delay(200);

          // Create donation for this user
          const donationAmount = getRandomAmount();
          try {
            await createDonation(token, donationAmount);
            totalDonations++;
          } catch (error: any) {
            console.error(`  ⚠️  Failed to create donation for ${email}: ${error.message}`);
            failedDonations++;
          }

          // Wait a bit between requests
          await delay(200);

          if ((i + 1) % 10 === 0) {
            console.log(`  ✓ Created ${i + 1}/${usersToCreate.length} users...`);
          }
        } catch (error: any) {
          console.error(`  ❌ Error creating user ${email}: ${error.message}`);
          failedUsers++;
        }
      }

      console.log(`  ✅ Completed ${country === 'southKorea' ? 'South Korea' : country.toUpperCase()} - ${usersToCreate.length} users processed`);
    }

    console.log(`\n\n🎉 Summary:`);
    console.log(`   ✅ Users created: ${totalUsers}`);
    console.log(`   ✅ Donations created: ${totalDonations}`);
    if (failedUsers > 0) {
      console.log(`   ❌ Failed users: ${failedUsers}`);
    }
    if (failedDonations > 0) {
      console.log(`   ❌ Failed donations: ${failedDonations}`);
    }
    console.log(`\n✅ All done! Users and donations are now in the database.\n`);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
};

createUsersAndDonations();

