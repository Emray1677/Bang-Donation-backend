# Quick Start Guide

## Setup Instructions

1. **Install Dependencies**
   ```bash
   cd backend
   yarn install
   ```

2. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` and add your MongoDB connection string:
   ```
   MONGODB_URI=mongodb://localhost:27017/bang-donation
   # OR for MongoDB Atlas:
   # MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bang-donation
   
   JWT_SECRET=your-secret-key-here
   ```

3. **Setup MongoDB** (Choose one option)

   **Option A: Install and Start Local MongoDB**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install -y mongodb
   sudo systemctl start mongod
   sudo systemctl enable mongod
   
   # Verify it's running
   sudo systemctl status mongod
   ```
   
   **Option B: Use MongoDB Atlas (Cloud - Recommended for beginners)**
   - Go to https://www.mongodb.com/cloud/atlas/register
   - Create free account and cluster
   - Get connection string and update `.env`
   - See `MONGODB_SETUP.md` for detailed instructions
   
   **⚠️ Important:** MongoDB must be running before starting the server!

4. **Start the Development Server**
   ```bash
   yarn dev
   ```

   The server will start on `http://localhost:5000` (or the PORT you specified in .env)

## Testing the API

### Health Check
```bash
curl http://localhost:5000/health
```

### Sign Up
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "full_name": "Test User"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Create Donation (with token from login)
```bash
curl -X POST http://localhost:5000/api/donations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "amount": 500,
    "message": "Supporting the cause!",
    "is_anonymous": false
  }'
```

## Frontend Integration

Update your frontend `.env` file to point to the backend:
```
VITE_API_URL=http://localhost:5000/api
```

## WebSocket Connection

The backend supports WebSocket connections for real-time updates. Connect using Socket.IO client:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});

socket.on('stats:update', (data) => {
  console.log('Stats updated:', data);
});
```

## Next Steps

- Add your MongoDB connection string to `.env`
- Set a strong `JWT_SECRET` in `.env`
- Update `FRONTEND_URL` if your frontend runs on a different port
- Start developing!

