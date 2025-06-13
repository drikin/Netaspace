#!/bin/bash

echo "=== Final Production Fix ==="

cd ~/Netaspace

# Kill all PM2 processes and daemon
pm2 kill
pkill -f pm2

# Clear PM2 logs and cache
rm -rf ~/.pm2/logs/*
rm -rf ~/.pm2/pids/*

# Export all environment variables
export NODE_ENV=production
export PORT=3000
export DATABASE_URL='postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require'
export SESSION_SECRET='neta-backspace-fm-super-secret-session-key-2025'
export HOST='0.0.0.0'

# Test if the build exists
if [ ! -f "dist/index.js" ]; then
    echo "Building application..."
    npm run build
fi

# Start with environment variables directly in command
NODE_ENV=production \
PORT=3000 \
DATABASE_URL='postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require' \
SESSION_SECRET='neta-backspace-fm-super-secret-session-key-2025' \
HOST='0.0.0.0' \
pm2 start dist/index.js --name "neta-app" --no-daemon

echo ""
echo "Checking PM2 status..."
pm2 status

echo ""
echo "Checking logs..."
pm2 logs neta-app --lines 20

echo ""
echo "Testing local health..."
sleep 3
curl -I http://localhost:3000/health

echo ""
echo "Testing external health..."
curl -I https://neta.backspace.fm/health