import mongoose from 'mongoose';

// Helper to mask sensitive info in connection string
const maskURI = (uri: string): string => {
  try {
    if (uri.includes('@')) {
      const parts = uri.split('@');
      if (parts.length === 2) {
        const auth = parts[0].split('://')[1];
        if (auth.includes(':')) {
          const [user, pass] = auth.split(':');
          return uri.replace(`${user}:${pass}`, `${user}:****`);
        }
      }
    }
    return uri;
  } catch {
    return '***';
  }
};

export const connectDB = async (): Promise<void> => {
  const maxRetries = 3;
  let retryCount = 0;

  // Get and clean the MongoDB URI
  let mongoURI = process.env.MONGODB_URI;
  
  if (!mongoURI) {
    console.error('\n❌ MONGODB_URI is not defined in environment variables');
    console.error('Please set MONGODB_URI in your .env file');
    console.error('Example: MONGODB_URI=mongodb://localhost:27017/bang-donation');
    console.error('Or for Atlas: MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/bang-donation\n');
    process.exit(1);
  }

  // Clean the URI (remove quotes, trim whitespace)
  mongoURI = mongoURI.trim().replace(/^["']|["']$/g, '');
  
  // Validate URI format
  if (!mongoURI.startsWith('mongodb://') && !mongoURI.startsWith('mongodb+srv://')) {
    console.error('\n❌ Invalid MongoDB URI format');
    console.error('URI must start with mongodb:// or mongodb+srv://');
    console.error(`Current URI: ${maskURI(mongoURI)}\n`);
    process.exit(1);
  }

  // Show connection attempt (masked for security)
  const maskedURI = maskURI(mongoURI);
  const isAtlas = mongoURI.includes('mongodb+srv://');
  console.log(`🔄 Connecting to MongoDB...`);
  console.log(`   URI: ${maskedURI}`);
  console.log(`   Type: ${isAtlas ? 'MongoDB Atlas (Cloud)' : 'Local MongoDB'}\n`);

  // Enhanced connection options for MongoDB Atlas
  const options = {
    serverSelectionTimeoutMS: 10000, // 10 seconds timeout
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    retryWrites: true,
    retryReads: true,
    maxPoolSize: 10,
    minPoolSize: 1,
    // MongoDB Atlas specific options
    ...(isAtlas && {
      tls: true,
      tlsAllowInvalidCertificates: false,
    }),
  };

  while (retryCount < maxRetries) {
    try {
      const conn = await mongoose.connect(mongoURI, options);
      console.log(`✅ MongoDB Connected Successfully!`);
      console.log(`   Host: ${conn.connection.host}`);
      console.log(`   Database: ${conn.connection.name}`);
      console.log(`   Ready State: ${conn.connection.readyState === 1 ? 'Connected' : 'Disconnected'}\n`);
      return; // Success, exit function
    } catch (error: any) {
      retryCount++;
      
      console.error(`\n❌ Connection attempt ${retryCount}/${maxRetries} failed:`);
      
      // Detailed error analysis
      if (error.name === 'MongooseServerSelectionError') {
        if (error.message.includes('getaddrinfo ENOTFOUND')) {
          console.error('   ❌ DNS resolution failed - hostname not found');
          console.error('   💡 Check if your MongoDB Atlas cluster URL is correct');
        } else if (error.message.includes('authentication failed')) {
          console.error('   ❌ Authentication failed');
          console.error('   💡 Check your username and password in the connection string');
        } else if (error.message.includes('ECONNREFUSED')) {
          console.error('   ❌ Connection refused - MongoDB server not running');
          if (!isAtlas) {
            console.error('   💡 Start MongoDB: sudo systemctl start mongod');
          }
        } else {
          console.error(`   ❌ ${error.message}`);
        }
      } else if (error.name === 'MongoServerError') {
        if (error.code === 8000 || error.message.includes('authentication')) {
          console.error('   ❌ Authentication failed');
          console.error('   💡 Verify username/password in connection string');
        } else {
          console.error(`   ❌ Server error: ${error.message}`);
        }
      } else if (error.code === 'ECONNREFUSED') {
        console.error('   ❌ Connection refused');
        console.error('   💡 MongoDB server is not running or not accessible');
        if (!isAtlas) {
          console.error('   💡 Start MongoDB: sudo systemctl start mongod');
        }
      } else {
        console.error(`   ❌ ${error.name}: ${error.message}`);
      }

      // If not last retry, wait and retry
      if (retryCount < maxRetries) {
        const waitTime = retryCount * 2; // 2s, 4s, 6s
        console.log(`\n   ⏳ Retrying in ${waitTime} seconds...\n`);
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      }
    }
  }

  // All retries failed
  console.error('\n❌ Failed to connect after', maxRetries, 'attempts\n');
  console.error('📝 Troubleshooting steps:');
  
  if (isAtlas) {
    console.error('   1. Verify your Atlas connection string is correct');
    console.error('   2. Check if your IP is whitelisted in Atlas Network Access');
    console.error('   3. Verify database user credentials');
    console.error('   4. Ensure your cluster is running (not paused)');
  } else {
    console.error('   1. Check if MongoDB is running: sudo systemctl status mongod');
    console.error('   2. Start MongoDB: sudo systemctl start mongod');
    console.error('   3. Verify connection: mongosh mongodb://localhost:27017');
    console.error('   4. Check MongoDB logs: sudo tail -f /var/log/mongodb/mongod.log');
    console.error('\n   OR use MongoDB Atlas (cloud):');
    console.error('   1. Get your Atlas connection string');
    console.error('   2. Update .env: MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/bang-donation');
  }
  
  // In development, allow server to start but with warning
  const isDevelopment = process.env.NODE_ENV !== 'production';
  if (isDevelopment) {
    console.error('\n⚠️  WARNING: Server will start WITHOUT database connection');
    console.error('   API endpoints requiring database will fail');
    console.error('   Fix MongoDB connection and restart server\n');
    return; // Don't exit, allow server to start
  }
  
  console.error('\n💡 The server will exit. Please fix the MongoDB connection and try again.\n');
  process.exit(1);
};

