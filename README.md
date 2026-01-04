# BANG CHAN Donation Backend API

Backend API server for the BANG CHAN Donation Platform built with Node.js, Express, TypeScript, MongoDB, and WebSockets.

## Features

- 🔐 **Authentication**: JWT-based authentication with signup/login
- 💰 **Donations**: Create, track, and manage donations
- 📊 **Statistics**: Real-time donation statistics and top supporters
- 👤 **User Profiles**: User profile management
- 🔔 **WebSockets**: Real-time updates for donations and statistics
- 🛡️ **Admin Panel**: Admin endpoints for managing users and donations
- 📝 **Activity Logging**: Track user activities
- ✅ **Input Validation**: Request validation using express-validator
- 🔒 **Security**: Helmet, CORS, and authentication middleware

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or MongoDB Atlas)
- Yarn package manager

## Installation

1. Install dependencies:
```bash
yarn install
```

2. Copy the environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: A secure random string for JWT tokens
   - `FRONTEND_URL`: Your frontend URL (default: http://localhost:5173)
   - `PORT`: Server port (default: 5000)

## Running the Server

### Development Mode
```bash
yarn dev
```

This will start the server with nodemon for auto-reloading.

### Production Mode
```bash
yarn build
yarn start
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (Protected)

### Donations
- `POST /api/donations` - Create a donation (Protected)
- `GET /api/donations/my` - Get user's donations (Protected)
- `GET /api/donations/stats` - Get donation statistics (Public)
- `GET /api/donations/top-supporters` - Get top supporters (Public)
- `GET /api/donations` - Get all donations with filters (Protected)
- `PATCH /api/donations/:id/status` - Update donation status (Admin)

### Profiles
- `GET /api/profiles/:id` - Get user profile (Public)
- `PATCH /api/profiles/:id` - Update profile (Protected)

### Admin
- `GET /api/admin/stats` - Get comprehensive admin statistics (Admin)
- `GET /api/admin/users` - Get all users (Admin)
- `GET /api/admin/donations` - Get all donations (Admin)
- `PATCH /api/admin/users/:id/role` - Update user role (Admin)

## WebSocket Events

### Client → Server
- `donation:create` - Create a new donation
- `donation:update-status` - Update donation status (Admin only)

### Server → Client
- `donation:created` - Donation created successfully
- `donation:new` - New donation notification (Admin)
- `donation:status-updated` - Donation status updated
- `stats:update` - Statistics updated
- `error` - Error occurred

## Database Models

### User
- email (unique)
- password (hashed)
- full_name
- avatar_url
- role (user/admin)
- is_verified

### Donation
- user_id (reference to User)
- amount (minimum $500)
- status (pending/confirmed/completed/cancelled)
- donation_method (gmail/telegram)
- message
- is_anonymous
- payment_reference

### ActivityLog
- user_id
- action
- resource_type
- resource_id
- details
- ip_address
- user_agent

## Environment Variables

See `.env.example` for all available environment variables.

## Security

- Passwords are hashed using bcrypt
- JWT tokens for authentication
- Helmet for security headers
- CORS configured
- Input validation on all routes
- Role-based access control

## License

ISC

