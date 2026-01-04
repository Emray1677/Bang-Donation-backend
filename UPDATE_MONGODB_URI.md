# How to Update MongoDB URI

## Quick Fix for MongoDB Connection

Your `.env` file currently has:
```
MONGODB_URI=mongodb://localhost:27017/bang-donation
```

This is trying to connect to **local MongoDB** which is not running.

## Option 1: Use MongoDB Atlas (Recommended)

1. **Get your MongoDB Atlas connection string:**
   - Go to your MongoDB Atlas dashboard
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string

2. **Update your `.env` file:**
   ```bash
   cd backend
   nano .env
   ```
   
   Replace the MONGODB_URI line with:
   ```
   MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/bang-donation?retryWrites=true&w=majority
   ```
   
   **Important:** 
   - Replace `YOUR_USERNAME` with your Atlas database username
   - Replace `YOUR_PASSWORD` with your Atlas database password
   - Replace `YOUR_CLUSTER` with your cluster name
   - Make sure there are NO quotes around the URI

3. **Save and restart:**
   ```bash
   # Press Ctrl+X, then Y, then Enter to save
   yarn dev
   ```

## Option 2: Start Local MongoDB

If you want to use local MongoDB instead:

```bash
# Install MongoDB (if not installed)
sudo apt update
sudo apt install -y mongodb

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify it's running
sudo systemctl status mongod
```

Then restart your server:
```bash
yarn dev
```

## Verify Connection

After updating, you should see:
```
✅ MongoDB Connected Successfully!
   Host: ...
   Database: bang-donation
```

## Common Issues

### "Authentication failed"
- Check your username and password in the connection string
- Make sure special characters in password are URL-encoded

### "getaddrinfo ENOTFOUND"
- Check your cluster URL is correct
- Verify your cluster is not paused in Atlas

### "IP not whitelisted"
- Go to Atlas → Network Access
- Add your IP address or use 0.0.0.0/0 for development

