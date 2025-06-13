#!/bin/bash

echo "=== Immediate Production Fix - 502 Error Resolution ==="

cd ~/Netaspace

# Stop all PM2 processes
pm2 kill

# Load environment variables explicitly
export DATABASE_URL='postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require'
export NODE_ENV='production'
export PORT='3000'
export SESSION_SECRET='your-super-secret-session-key-change-this-in-production'
export HOST='0.0.0.0'

# Build the application
npm run build

# Start with explicit environment variables
DATABASE_URL='postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require' \
NODE_ENV='production' \
PORT='3000' \
SESSION_SECRET='your-super-secret-session-key-change-this-in-production' \
HOST='0.0.0.0' \
pm2 start ecosystem.config.js --env production

echo "Application restarted with explicit environment variables"
echo ""
echo "Checking status..."
pm2 status
pm2 logs --lines 10

echo ""
echo "Testing health endpoint..."
sleep 5
curl -I http://localhost:3000/health