# MongoDB Setup Guide

## Quick Fix: MongoDB Connection Error

If you're seeing `ECONNREFUSED 127.0.0.1:27017`, MongoDB is not running.

## Option 1: Use Local MongoDB

### Install MongoDB (if not installed)

**Linux (Ubuntu/Debian):**
```bash
# Install MongoDB
sudo apt update
sudo apt install -y mongodb

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod  # Auto-start on boot

# Check if running
sudo systemctl status mongod
```

**macOS:**
```bash
# Install via Homebrew
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community
```

**Windows:**
- Download from: https://www.mongodb.com/try/download/community
- Install and start MongoDB service

### Verify MongoDB is Running
```bash
# Check if MongoDB is accessible
mongosh --eval "db.version()"
# or
mongo --eval "db.version()"
```

### Update .env
Make sure your `.env` has:
```
MONGODB_URI=mongodb://localhost:27017/bang-donation
```

## Option 2: Use MongoDB Atlas (Cloud - Recommended)

1. **Create Free Account:**
   - Go to https://www.mongodb.com/cloud/atlas/register
   - Sign up for free (M0 cluster)

2. **Create Cluster:**
   - Click "Build a Database"
   - Choose FREE tier (M0)
   - Select a cloud provider and region
   - Click "Create"

3. **Setup Database Access:**
   - Go to "Database Access" → "Add New Database User"
   - Create username and password (save these!)
   - Set privileges to "Read and write to any database"

4. **Setup Network Access:**
   - Go to "Network Access" → "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0) for development
   - Or add your specific IP address

5. **Get Connection String:**
   - Go to "Database" → "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with `bang-donation`

6. **Update .env:**
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bang-donation?retryWrites=true&w=majority
   ```

## Test Connection

After setting up MongoDB, restart your server:
```bash
cd backend
yarn dev
```

You should see:
```
✅ MongoDB Connected: ...
📊 Database: bang-donation
```

## Troubleshooting

### MongoDB not starting (Linux)
```bash
# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Restart MongoDB
sudo systemctl restart mongod
```

### Permission denied
```bash
# Make sure MongoDB data directory exists and has correct permissions
sudo mkdir -p /data/db
sudo chown -R mongodb:mongodb /data/db
```

### Port already in use
```bash
# Check what's using port 27017
sudo lsof -i :27017

# Kill the process if needed
sudo kill -9 <PID>
```

