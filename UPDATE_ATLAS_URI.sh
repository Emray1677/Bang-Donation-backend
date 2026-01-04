#!/bin/bash

echo "=========================================="
echo "MongoDB Atlas Connection String Updater"
echo "=========================================="
echo ""
echo "Please provide your MongoDB Atlas connection details:"
echo ""

read -p "Enter your Atlas username: " username
read -sp "Enter your Atlas password: " password
echo ""
read -p "Enter your Atlas cluster name (e.g., cluster0.xxxxx): " cluster
read -p "Enter database name [bang-donation]: " dbname
dbname=${dbname:-bang-donation}

# Build the connection string
ATLAS_URI="mongodb+srv://${username}:${password}@${cluster}.mongodb.net/${dbname}?retryWrites=true&w=majority"

echo ""
echo "Updating .env file..."
echo ""

# Update the .env file
cd "$(dirname "$0")"

# Create backup if .env exists
if [ -f .env ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backup created: .env.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Update MONGODB_URI in .env
if grep -q "^MONGODB_URI=" .env 2>/dev/null; then
    # Replace existing MONGODB_URI
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|^MONGODB_URI=.*|MONGODB_URI=${ATLAS_URI}|" .env
    else
        # Linux
        sed -i "s|^MONGODB_URI=.*|MONGODB_URI=${ATLAS_URI}|" .env
    fi
    echo "✅ Updated MONGODB_URI in .env"
else
    # Add MONGODB_URI if it doesn't exist
    echo "MONGODB_URI=${ATLAS_URI}" >> .env
    echo "✅ Added MONGODB_URI to .env"
fi

echo ""
echo "=========================================="
echo "✅ Done! Your .env file has been updated."
echo "=========================================="
echo ""
echo "Your MongoDB Atlas URI (password hidden):"
echo "mongodb+srv://${username}:***@${cluster}.mongodb.net/${dbname}?retryWrites=true&w=majority"
echo ""
echo "Now restart your server: yarn dev"
echo ""

