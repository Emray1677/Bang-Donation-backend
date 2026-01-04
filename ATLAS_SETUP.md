# MongoDB Atlas Setup - Quick Guide

## Your server is currently trying to connect to local MongoDB, but you're using Atlas!

## Quick Fix - Option 1: Use the Helper Script

Run this command and follow the prompts:
```bash
cd backend
./UPDATE_ATLAS_URI.sh
```

It will ask for:
- Your Atlas username
- Your Atlas password  
- Your cluster name (e.g., `cluster0.xxxxx.mongodb.net`)
- Database name (default: `bang-donation`)

## Quick Fix - Option 2: Manual Update

1. **Get your MongoDB Atlas connection string:**
   - Go to https://cloud.mongodb.com
   - Click on your cluster → "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - It looks like: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`

2. **Edit your .env file:**
   ```bash
   cd backend
   nano .env
   ```

3. **Find this line:**
   ```
   MONGODB_URI=mongodb://localhost:27017/bang-donation
   ```

4. **Replace it with your Atlas connection string:**
   ```
   MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/bang-donation?retryWrites=true&w=majority
   ```
   
   **Important:**
   - Replace `YOUR_USERNAME` with your actual Atlas username
   - Replace `YOUR_PASSWORD` with your actual Atlas password
   - Replace `YOUR_CLUSTER` with your cluster name (e.g., `cluster0.xxxxx`)
   - Make sure there are **NO QUOTES** around the URI
   - Add `/bang-donation` before the `?` to specify the database name

5. **Save the file:**
   - Press `Ctrl+X`
   - Press `Y` to confirm
   - Press `Enter` to save

6. **Restart your server:**
   ```bash
   yarn dev
   ```

## Example .env Entry

```bash
# MongoDB Configuration
MONGODB_URI=mongodb+srv://myuser:mypassword@cluster0.abc123.mongodb.net/bang-donation?retryWrites=true&w=majority
```

## Verify Connection

After updating, you should see:
```
✅ MongoDB Connected Successfully!
   Host: cluster0.xxxxx.mongodb.net
   Database: bang-donation
```

## Common Issues

### "Authentication failed"
- Double-check your username and password
- Make sure special characters in password are URL-encoded (e.g., `@` becomes `%40`)

### "getaddrinfo ENOTFOUND"
- Verify your cluster URL is correct
- Check if your cluster is paused in Atlas dashboard

### "IP not whitelisted"
- Go to Atlas → Network Access
- Click "Add IP Address"
- Add `0.0.0.0/0` for development (allows all IPs)
- Or add your specific IP address

### Connection string format
Make sure your connection string:
- Starts with `mongodb+srv://`
- Has username and password before the `@`
- Has cluster name after the `@`
- Includes `/bang-donation` for the database name
- Has query parameters: `?retryWrites=true&w=majority`

## Need Help?

If you're still having issues:
1. Check `UPDATE_MONGODB_URI.md` for more details
2. Verify your Atlas cluster is running (not paused)
3. Check your database user has read/write permissions
4. Ensure your IP is whitelisted in Network Access

