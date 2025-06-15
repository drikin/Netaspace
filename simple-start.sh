#!/bin/bash

echo "=== Simple PM2 Start - Production Fix ==="

cd ~/Netaspace

# Kill existing PM2 processes
pm2 kill

# Set environment variables
export NODE_ENV=production
export PORT=3000
export DATABASE_URL='postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require'
export SESSION_SECRET='neta-backspace-fm-super-secret-session-key-2025'
export DOMAIN='neta.backspace.fm'
export PROTOCOL='https'
export HOST='0.0.0.0'
export SERVER_IP='153.125.147.133'
export TRUSTED_PROXIES='127.0.0.1,153.125.147.133'
export LOG_LEVEL='info'
export RATE_LIMIT_WINDOW_MS=900000
export RATE_LIMIT_MAX_REQUESTS=100

# Start with simple PM2 command
pm2 start dist/index.js --name "neta-app"

echo "Application started with PM2"
echo ""
echo "Checking status..."
pm2 status
pm2 logs --lines 10

echo ""
echo "Testing health endpoint..."
sleep 5
curl -I http://localhost:3000/health