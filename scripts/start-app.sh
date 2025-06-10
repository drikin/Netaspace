#!/bin/bash

# Application startup script with database permission fixes
set -e

echo "Starting application..."

# Fix database permissions before starting the app
echo "Ensuring database permissions are correct..."
mkdir -p /app/database
chmod 775 /app/database

# Start the Node.js application
echo "Starting Node.js server..."
exec npm run start