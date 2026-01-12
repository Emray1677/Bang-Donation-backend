import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from './config/database';
import { setupSocketHandlers } from './socket/socketHandlers';

// Import routes
import authRoutes from './routes/auth';
import donationRoutes from './routes/donations';
import profileRoutes from './routes/profiles';
import adminRoutes from './routes/admin';

// Load environment variables
dotenv.config({ path: '.env' });

// Verify critical environment variables are loaded
if (!process.env.MONGODB_URI) {
  console.error('\n⚠️  Warning: MONGODB_URI not found in environment');
  console.error('Make sure .env file exists in the backend directory\n');
}

const app = express();
const server = http.createServer(app);

// Get allowed origins from environment or use defaults
const getAllowedOrigins = () => {
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
  }
  
  // Default origins
  const defaults = [
    'http://localhost:5173', 
    'http://localhost:5174',
    'https://bang-donation.vercel.app',
    'https://bang-donation-admin.vercel.app'
  ];
  
  return defaults;
};

const allowedOrigins = getAllowedOrigins();

// Log allowed origins
console.log('🌐 Allowed CORS origins:', allowedOrigins);
console.log('🌐 Environment:', process.env.NODE_ENV || 'development');

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      // In production, allow vercel.app and onrender.com domains
      if (process.env.NODE_ENV === 'production') {
        if (origin.includes('vercel.app') || origin.includes('onrender.com')) {
          return callback(null, true);
        }
      }
      const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
      const isAllowed = allowedOrigins.some(allowed => {
        const normalizedAllowed = allowed.endsWith('/') ? allowed.slice(0, -1) : allowed;
        return normalizedOrigin === normalizedAllowed || 
               normalizedOrigin.startsWith(normalizedAllowed + '/') ||
               normalizedOrigin.includes(normalizedAllowed);
      });
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Setup socket handlers
setupSocketHandlers(io);

// Make io available to routes if needed
app.set('io', io);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
})); // Security headers
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl requests, or server-to-server)
    if (!origin) {
      return callback(null, true);
    }
    
    // In production, be more lenient - allow vercel.app and onrender.com domains
    if (process.env.NODE_ENV === 'production') {
      // Allow all vercel.app and onrender.com subdomains
      if (origin.includes('vercel.app') || origin.includes('onrender.com') || origin.includes('vercel.com')) {
        return callback(null, true);
      }
    }
    
    // Normalize origin (remove trailing slash)
    const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
    
    // Check if origin is in allowed list (exact match or contains)
    const isAllowed = allowedOrigins.some(allowed => {
      const normalizedAllowed = allowed.endsWith('/') ? allowed.slice(0, -1) : allowed;
      // Exact match
      if (normalizedOrigin === normalizedAllowed) {
        return true;
      }
      // Check if origin contains the allowed domain (for subdomains)
      if (normalizedOrigin.includes(normalizedAllowed)) {
        return true;
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      // Log the rejected origin for debugging (always log in production to help debug)
      console.warn(`⚠️  CORS: Rejected origin: ${origin}`);
      console.warn(`   Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error(`Not allowed by CORS. Origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan('dev')); // Logging
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Bang Donation Backend is running 🚀",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    api_url: `${req.protocol}://${req.get('host')}/api`
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Connect to database and start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Try to connect to database (non-blocking in development)
    await connectDB().catch((error) => {
      // Error already logged in connectDB, just continue
      console.log('⚠️  Continuing without database connection...\n');
    });
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      if (!mongoose.connection.readyState) {
        console.log(`⚠️  MongoDB: Not connected - API will have limited functionality\n`);
      } else {
        console.log(`✅ MongoDB: Connected\n`);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { io };

