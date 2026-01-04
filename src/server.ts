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
  const origins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:5174'];
  return origins;
};

const allowedOrigins = getAllowedOrigins();

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins,
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
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan('dev')); // Logging
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

